import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';

/**
 * Exercises the real route table, including the lazy `loadComponent` imports.
 * Route order and redirect config are easy to break and produce failures that
 * only show up at runtime, so they are worth pinning down here.
 */
describe('app routes', () => {
  let harness: RouterTestingHarness;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.removeItem('archive-lens.saved-items.v1');

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('archive-lens.saved-items.v1');
  });

  function title(): string {
    return TestBed.inject(Title).getTitle();
  }

  function url(): string {
    return TestBed.inject(Router).url;
  }

  it('redirects the empty path to search', async () => {
    await harness.navigateByUrl('/');

    expect(url()).toBe('/search');
  });

  it('does not redirect other paths to search', async () => {
    // The guard against pathMatch: 'prefix' on the '' redirect, which would
    // swallow every URL in the app.
    await harness.navigateByUrl('/saved');

    expect(url()).toBe('/saved');
  });

  it('lazily loads the search page and sets its title', async () => {
    const view = await harness.navigateByUrl('/search');

    expect(title()).toBe('Search — Archive Lens');
    expect(view).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain('Search the collection');
  });

  it('lazily loads the saved page and sets its title', async () => {
    await harness.navigateByUrl('/saved');

    expect(title()).toBe('Saved items — Archive Lens');
    expect(harness.routeNativeElement?.textContent).toContain('Saved items');
  });

  it('binds the :id segment into the detail component input', async () => {
    await harness.navigateByUrl('/item/2005691065');

    const req = httpMock.expectOne((r) => r.url === 'https://www.loc.gov/item/2005691065/');
    req.flush({
      item: {
        id: 'http://www.loc.gov/item/2005691065/',
        title: 'Lighthouse, Biloxi, Mississippi',
      },
    });
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Lighthouse, Biloxi, Mississippi',
    );
  });

  it('falls through to the not-found page for an unknown URL', async () => {
    await harness.navigateByUrl('/no-such-page');

    expect(title()).toBe('Page not found — Archive Lens');
    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });

  it('does not treat a bare query string as an unknown route', async () => {
    await harness.navigateByUrl('/search?q=');

    expect(title()).toBe('Search — Archive Lens');
  });
});
