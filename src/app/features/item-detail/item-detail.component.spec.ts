import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { ItemDetailComponent } from './item-detail.component';

describe('ItemDetailComponent', () => {
  let fixture: ComponentFixture<ItemDetailComponent>;
  let httpMock: HttpTestingController;

  const itemResponse = {
    item: {
      id: 'http://www.loc.gov/item/2005691065/',
      title: 'Lighthouse, Biloxi, Mississippi',
      date: '1920-01-01',
      summary: 'Photograph showing lighthouse and pier.',
      link: 'https://www.loc.gov/pictures/item/2005691065/',
      image_url: ['https://tile.loc.gov/thumb.jpg'],
      medium: ['1 photographic print.'],
      notes: ['Wittemann Collection.', 'Title from item.'],
      subjects: [{ biloxi: 'https://www.loc.gov/search/?fa=subject:biloxi' }],
      format: [{ 'photo, print, drawing': 'https://www.loc.gov/search/' }],
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemDetailComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemDetailComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function load(id = '2005691065'): void {
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  }

  function respondWith(body: object, id = '2005691065'): void {
    httpMock.expectOne((r) => r.url === `https://www.loc.gov/item/${id}/`).flush(body);
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent;
  }

  function liveRegion(): HTMLElement {
    return fixture.nativeElement.querySelector('[role="status"]');
  }

  it('requests the item named in the route', () => {
    load();

    const req = httpMock.expectOne((r) => r.url === 'https://www.loc.gov/item/2005691065/');
    expect(req.request.params.get('at')).toBe('item');
    req.flush(itemResponse);
  });

  it('announces and shows a loading state first', () => {
    load();

    expect(liveRegion().textContent).toContain('Loading item');
    respondWith(itemResponse);
  });

  it('renders the item once loaded', () => {
    load();
    respondWith(itemResponse);

    expect(fixture.nativeElement.querySelector('h2').textContent).toContain(
      'Lighthouse, Biloxi, Mississippi',
    );
    expect(text()).toContain('Photograph showing lighthouse and pier.');
    expect(text()).toContain('1920-01-01');
    expect(text()).toContain('biloxi');
    expect(text()).toContain('Wittemann Collection.');
  });

  it('gives the image an empty alt, since the API supplies no description', () => {
    load();
    respondWith(itemResponse);

    expect(fixture.nativeElement.querySelector('figure img').getAttribute('alt')).toBe('');
  });

  it('pairs labels with values in a description list', () => {
    load();
    respondWith(itemResponse);

    const labels = [...fixture.nativeElement.querySelectorAll('dl dt')].map((el) =>
      (el as HTMLElement).textContent?.trim(),
    );
    expect(labels).toContain('Date');
    expect(labels).toContain('Format');
  });

  it('sets the document title from the item', () => {
    load();
    respondWith(itemResponse);

    expect(TestBed.inject(Title).getTitle()).toBe(
      'Lighthouse, Biloxi, Mississippi — Archive Lens',
    );
  });

  it('links out to loc.gov and warns that it opens a new tab', () => {
    load();
    respondWith(itemResponse);

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.source');
    expect(link.getAttribute('href')).toBe('https://www.loc.gov/pictures/item/2005691065/');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.textContent).toContain('opens in a new tab');
  });

  it('shows a recovery link when the item is missing', () => {
    load('missing');

    httpMock
      .expectOne((r) => r.url === 'https://www.loc.gov/item/missing/')
      .flush('', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(text()).toContain('could not be found');
    expect(fixture.nativeElement.querySelector('.error a')).not.toBeNull();
    expect(liveRegion().textContent).toContain('could not be found');
  });

  it('always offers a way back to search', () => {
    load();
    respondWith(itemResponse);

    expect(fixture.nativeElement.querySelector('a.back').getAttribute('href')).toBe('/search');
  });
});
