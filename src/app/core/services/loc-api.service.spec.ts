import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { LocApiError, LocApiService } from './loc-api.service';

describe('LocApiService', () => {
  let service: LocApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(LocApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // Fails the test if any request was made but never answered, or answered
  // but never expected.
  afterEach(() => httpMock.verify());

  describe('search', () => {
    it('requests the search endpoint with the expected params', () => {
      service.search('lighthouse', 2, 10).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === 'https://www.loc.gov/search/',
      );

      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('q')).toBe('lighthouse');
      expect(req.request.params.get('fo')).toBe('json');
      expect(req.request.params.get('at')).toBe('results,pagination');
      expect(req.request.params.get('sp')).toBe('2');
      expect(req.request.params.get('c')).toBe('10');

      req.flush({ results: [], pagination: {} });
    });

    it('defaults to page 1 and a 25-item page size', () => {
      service.search('maps').subscribe();

      const req = httpMock.expectOne((r) => r.url === 'https://www.loc.gov/search/');
      expect(req.request.params.get('sp')).toBe('1');
      expect(req.request.params.get('c')).toBe('25');

      req.flush({ results: [], pagination: {} });
    });

    it('maps the response through the domain mappers', (done) => {
      service.search('lighthouse').subscribe((results) => {
        expect(results.total).toBe(75912);
        expect(results.items.length).toBe(1);
        expect(results.items[0].id).toBe('2005691065');
        expect(results.items[0].contributors).toEqual([]);
        done();
      });

      httpMock.expectOne((r) => r.url === 'https://www.loc.gov/search/').flush({
        results: [
          {
            id: 'http://www.loc.gov/item/2005691065/',
            title: 'Lighthouse, Biloxi, Mississippi',
            url: 'https://www.loc.gov/item/2005691065/',
            image_url: [],
            contributor: null,
          },
        ],
        pagination: { current: 1, perpage: 25, total: 75912 },
      });
    });

    it('reports a connection failure in plain language', (done) => {
      service.search('lighthouse').subscribe({
        error: (error: LocApiError) => {
          expect(error).toBeInstanceOf(LocApiError);
          expect(error.status).toBe(0);
          expect(error.message).toContain('too many requests');
          done();
        },
      });

      httpMock
        .expectOne((r) => r.url === 'https://www.loc.gov/search/')
        .error(new ProgressEvent('network error'));
    });

    it('explains a rate-limit response', (done) => {
      service.search('lighthouse').subscribe({
        error: (error: LocApiError) => {
          expect(error.status).toBe(429);
          expect(error.message).toContain('Too many requests');
          done();
        },
      });

      // LoC answers rate-limited requests with a Cloudflare HTML page.
      httpMock
        .expectOne((r) => r.url === 'https://www.loc.gov/search/')
        .flush('<!DOCTYPE html><html><title>Just a moment...</title></html>', {
          status: 429,
          statusText: 'Too Many Requests',
        });
    });

    it('reports a server failure without leaking the status text', (done) => {
      service.search('lighthouse').subscribe({
        error: (error: LocApiError) => {
          expect(error.status).toBe(503);
          expect(error.message).toContain('not responding');
          done();
        },
      });

      httpMock
        .expectOne((r) => r.url === 'https://www.loc.gov/search/')
        .flush('upstream exploded', { status: 503, statusText: 'Service Unavailable' });
    });
  });

  describe('getItem', () => {
    it('requests the item endpoint and maps the result', (done) => {
      service.getItem('2005691065').subscribe((item) => {
        expect(item.id).toBe('2005691065');
        expect(item.title).toBe('Lighthouse, Biloxi, Mississippi');
        expect(item.subjects).toEqual(['biloxi']);
        done();
      });

      const req = httpMock.expectOne(
        (r) => r.url === 'https://www.loc.gov/item/2005691065/',
      );
      expect(req.request.params.get('at')).toBe('item');

      req.flush({
        item: {
          id: 'http://www.loc.gov/item/2005691065/',
          title: 'Lighthouse, Biloxi, Mississippi',
          subjects: [{ biloxi: 'https://www.loc.gov/search/?fa=subject:biloxi' }],
        },
      });
    });

    it('treats an unmappable 200 response as a missing item', (done) => {
      service.getItem('nonsense').subscribe({
        error: (error: LocApiError) => {
          expect(error.status).toBe(404);
          expect(error.message).toContain('could not be found');
          done();
        },
      });

      httpMock
        .expectOne((r) => r.url === 'https://www.loc.gov/item/nonsense/')
        .flush({});
    });

    it('surfaces a 404 from the API', (done) => {
      service.getItem('missing').subscribe({
        error: (error: LocApiError) => {
          expect(error.status).toBe(404);
          done();
        },
      });

      httpMock
        .expectOne((r) => r.url === 'https://www.loc.gov/item/missing/')
        .flush('', { status: 404, statusText: 'Not Found' });
    });
  });
});
