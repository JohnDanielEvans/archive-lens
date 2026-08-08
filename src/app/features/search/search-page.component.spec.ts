import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

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

  it('shows placeholder cards while loading, hidden from assistive tech', () => {
    setQuery('lighthouse');

    const skeletons = fixture.nativeElement.querySelector('.skeletons');
    expect(skeletons).not.toBeNull();
    // The live region already announces "Searching…"; the placeholders are
    // purely visual and must not be read out as empty list items.
    expect(skeletons.getAttribute('aria-hidden')).toBe('true');
    expect(skeletons.querySelectorAll('.skeleton-card').length).toBe(6);

    respondWith({ results: [], pagination: { total: 0 } });
  });

  it('removes the placeholders once results arrive', () => {
    setQuery('lighthouse');
    respondWith(oneResult);

    expect(fixture.nativeElement.querySelector('.skeletons')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-item-card').length).toBe(1);
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
    expect(text()).toContain('Check the spelling');
    expect(liveRegion().textContent).toContain('No results found for zzzzzzz');
  });

  it('treats an empty result list as empty even when the API reports a total', () => {
    // LoC really does answer a no-match query with results: [] and total: 1.
    setQuery('qwzkxjvlmnptrbdf');
    respondWith({ results: [], pagination: { current: 1, perpage: 25, total: 1, of: 0 } });

    expect(text()).toContain('No results found');
    expect(text()).not.toContain('1 results found');
    expect(liveRegion().textContent).toContain('No results found for qwzkxjvlmnptrbdf');
  });

  it('keeps the empty-state suggestions readable by assistive tech', () => {
    setQuery('zzzzzzz');
    respondWith({ results: [], pagination: { current: 1, perpage: 25, total: 0 } });

    expect(fixture.nativeElement.querySelector('.empty').getAttribute('aria-hidden')).toBeNull();
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

  describe('pagination', () => {
    const paged = (next: string | null, previous: string | null) => ({
      results: oneResult.results,
      pagination: { current: 2, perpage: 25, total: 500, next, previous },
    });

    function pageLinks(): string[] {
      return [...fixture.nativeElement.querySelectorAll('.pagination a')].map(
        (a) => (a as HTMLAnchorElement).textContent?.trim() ?? '',
      );
    }

    it('requests the page named in the URL', () => {
      fixture.componentRef.setInput('q', 'lighthouse');
      fixture.componentRef.setInput('page', '3');
      fixture.detectChanges();

      const req = httpMock.expectOne((r) => r.url === 'https://www.loc.gov/search/');
      expect(req.request.params.get('sp')).toBe('3');
      req.flush(oneResult);
    });

    it('falls back to page 1 for a nonsense page parameter', () => {
      fixture.componentRef.setInput('q', 'lighthouse');
      fixture.componentRef.setInput('page', 'abc');
      fixture.detectChanges();

      const req = httpMock.expectOne((r) => r.url === 'https://www.loc.gov/search/');
      expect(req.request.params.get('sp')).toBe('1');
      req.flush(oneResult);
    });

    it('shows both links in the middle of the results', () => {
      fixture.componentRef.setInput('q', 'lighthouse');
      fixture.componentRef.setInput('page', '2');
      fixture.detectChanges();
      respondWith(paged('https://www.loc.gov/search/?sp=3', 'https://www.loc.gov/search/?sp=1'));

      expect(pageLinks()).toEqual(['Previous page', 'Next page']);
      expect(text()).toContain('Page 2');
    });

    it('omits Next when the API reports no further pages', () => {
      fixture.componentRef.setInput('q', 'lighthouse');
      fixture.componentRef.setInput('page', '2');
      fixture.detectChanges();
      respondWith(paged(null, 'https://www.loc.gov/search/?sp=1'));

      expect(pageLinks()).toEqual(['Previous page']);
    });

    it('refetches when only the page changes', () => {
      setQuery('lighthouse');
      respondWith(oneResult);

      fixture.componentRef.setInput('page', 2);
      fixture.detectChanges();

      const req = httpMock.expectOne((r) => r.url === 'https://www.loc.gov/search/');
      expect(req.request.params.get('q')).toBe('lighthouse');
      expect(req.request.params.get('sp')).toBe('2');
      req.flush(oneResult);
    });

    it('hides the pagination nav entirely on a single page of results', () => {
      setQuery('lighthouse');
      respondWith(oneResult);

      expect(fixture.nativeElement.querySelector('.pagination')).toBeNull();
    });

    it('announces the page number beyond the first', () => {
      fixture.componentRef.setInput('q', 'lighthouse');
      fixture.componentRef.setInput('page', '2');
      fixture.detectChanges();
      respondWith(paged(null, 'https://www.loc.gov/search/?sp=1'));

      expect(liveRegion().textContent).toContain('Page 2');
    });
  });

  it('navigates rather than fetching when the form is submitted', () => {
    // The URL is the source of truth: submitting must change the address, and
    // the resulting ?q= is what triggers the request. Submitting page 1 also
    // drops any existing page param, so a new search starts from the top.
    setQuery('');
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#search-query');
    input.value = 'lighthouse';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/search'], {
      queryParams: { q: 'lighthouse' },
    });
    httpMock.expectNone(() => true);
  });

  it('does not refetch when the inputs are set again with the same values', () => {
    setQuery('lighthouse');
    respondWith(oneResult);

    // Mimics the router applying q and page in separate passes.
    fixture.componentRef.setInput('q', 'lighthouse');
    fixture.componentRef.setInput('page', 1);
    fixture.detectChanges();

    httpMock.expectNone(() => true);
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
