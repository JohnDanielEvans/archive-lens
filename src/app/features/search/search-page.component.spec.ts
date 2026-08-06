import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SearchPageComponent } from './search-page.component';

describe('SearchPageComponent', () => {
  let fixture: ComponentFixture<SearchPageComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchPageComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Sets the `q` input the way the router would, then renders. */
  function setQuery(q: string): void {
    fixture.componentRef.setInput('q', q);
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent;
  }

  function liveRegion(): HTMLElement {
    return fixture.nativeElement.querySelector('[role="status"]');
  }

  function respondWith(body: object): void {
    httpMock.expectOne((r) => r.url === 'https://www.loc.gov/search/').flush(body);
    fixture.detectChanges();
  }

  const oneResult = {
    results: [
      {
        id: 'http://www.loc.gov/item/2005691065/',
        title: 'Lighthouse, Biloxi, Mississippi',
        url: 'https://www.loc.gov/item/2005691065/',
        date: '1920-01-01',
      },
    ],
    pagination: { current: 1, perpage: 25, total: 1 },
  };

  it('shows the idle prompt and makes no request without a query', () => {
    setQuery('');

    expect(text()).toContain('Enter a search term');
    httpMock.expectNone(() => true);
  });

  it('survives an absent query parameter', () => {
    // The router binds `undefined` when ?q= is missing entirely, which
    // overrides the input's declared default. Visiting /search used to throw.
    fixture.componentRef.setInput('q', undefined);
    fixture.detectChanges();

    expect(text()).toContain('Enter a search term');
    expect(fixture.nativeElement.querySelector('#search-query').value).toBe('');
    httpMock.expectNone(() => true);
  });

  it('shows a loading state while the request is in flight', () => {
    setQuery('lighthouse');

    expect(text()).toContain('Searching');
    expect(liveRegion().textContent).toContain('Searching');

    respondWith({ results: [], pagination: { total: 0 } });
  });

  it('renders results once the request resolves', () => {
    setQuery('lighthouse');
    respondWith(oneResult);

    expect(text()).toContain('Lighthouse, Biloxi, Mississippi');
    expect(text()).toContain('1920-01-01');
  });

  it('announces the result count in the live region', () => {
    setQuery('lighthouse');
    respondWith({ ...oneResult, pagination: { current: 1, perpage: 25, total: 75912 } });

    expect(liveRegion().textContent).toContain('75,912 results found for lighthouse');
  });

  it('shows an empty state when nothing matches', () => {
    setQuery('zzzzzzz');
    respondWith({ results: [], pagination: { current: 1, perpage: 25, total: 0 } });

    expect(text()).toContain('No results found');
    expect(liveRegion().textContent).toContain('No results found for zzzzzzz');
  });

  it('shows a user-safe message when the request fails', () => {
    setQuery('lighthouse');

    httpMock
      .expectOne((r) => r.url === 'https://www.loc.gov/search/')
      .flush('upstream exploded', { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();

    expect(text()).toContain('not responding');
    expect(text()).not.toContain('upstream exploded');
    expect(liveRegion().textContent).toContain('not responding');
  });

  it('keeps the live region in the DOM at all times', () => {
    setQuery('');
    expect(liveRegion()).not.toBeNull();
    expect(liveRegion().textContent?.trim()).toBe('');
  });

  it('seeds the search field from the query parameter', () => {
    setQuery('lighthouse');

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#search-query');
    expect(input.value).toBe('lighthouse');

    respondWith(oneResult);
  });

  it('issues a new request when the query parameter changes', () => {
    setQuery('lighthouse');
    respondWith(oneResult);

    setQuery('maps');
    const req = httpMock.expectOne((r) => r.url === 'https://www.loc.gov/search/');
    expect(req.request.params.get('q')).toBe('maps');
    req.flush({ results: [], pagination: { total: 0 } });
  });
});
