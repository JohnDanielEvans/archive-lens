import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, of, startWith, switchMap } from 'rxjs';

import { SearchResults } from '../../core/models/collection-item.model';
import { LocApiError, LocApiService } from '../../core/services/loc-api.service';
import { ItemCardComponent } from '../../shared/item-card/item-card.component';
import { SearchFormComponent } from './search-form.component';

/**
 * The four states a search can be in. A discriminated union means the template
 * can only read `results` in the success branch and `message` in the error
 * branch — impossible states stop compiling.
 */
type SearchState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly results: SearchResults }
  | { readonly status: 'error'; readonly message: string };

@Component({
  selector: 'app-search-page',
  imports: [SearchFormComponent, ItemCardComponent, RouterLink],
  templateUrl: './search-page.component.html',
  styles: `
    h2 {
      margin: 0 0 1.5rem;
      font-size: clamp(1.75rem, 4vw, 2.25rem);
    }

    .prompt,
    .loading {
      margin: 2rem 0;
      font-size: 1.0625rem;
      color: var(--ink-muted);
    }

    .count {
      margin: 2rem 0 0;
      font-size: 0.875rem;
      color: var(--ink-muted);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .results {
      display: grid;
      /* min() is load-bearing: a bare minmax(20rem, 1fr) forces a 320px
         column even on a narrower viewport, which scrolls the whole page
         sideways. */
      grid-template-columns: repeat(auto-fill, minmax(min(20rem, 100%), 1fr));
      gap: 1rem;
      padding: 0;
      margin: 0.75rem 0 0;
      list-style: none;
    }

    .error {
      max-width: 40rem;
      padding: 1rem 1.25rem;
      margin-top: 2rem;
      color: var(--error);
      background: var(--error-wash);
      border: 1px solid currentcolor;
      border-radius: var(--radius);
    }

    /* Not aria-hidden, unlike the other visible state text: the live region
       announces only the short "No results found" sentence, and these
       suggestions are genuinely useful to read. */
    .empty {
      max-width: 40rem;
      padding: 1.25rem 1.5rem;
      margin-top: 2rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
    }

    .empty p {
      margin: 0 0 0.5rem;
    }

    .empty ul {
      padding-left: 1.25rem;
      margin: 0;
      color: var(--ink-muted);
    }

    .empty li + li {
      margin-top: 0.25rem;
    }

    .pagination {
      display: flex;
      gap: 1rem;
      align-items: center;
      padding-top: 1.5rem;
      margin-top: 2rem;
      border-top: 1px solid var(--border);
    }

    .pagination a {
      padding: 0.5rem 1.125rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--accent);
      text-decoration: none;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-sm);
      transition:
        border-color 0.15s ease,
        background-color 0.15s ease;
    }

    .pagination a:hover {
      background: var(--accent-wash);
      border-color: var(--accent);
    }

    .pagination__status {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ink-muted);
    }

    /* Keeps "Next" on the right when there is no "Previous" to balance it. */
    .pagination__next {
      margin-left: auto;
    }
  `,
})
export class SearchPageComponent {
  private readonly api = inject(LocApiService);
  private readonly router = inject(Router);

  /**
   * Bound from the `q` URL query parameter by withComponentInputBinding().
   * The URL is the single source of truth: a search is shareable, the back
   * button works, and a reload restores the same results.
   *
   * The transform is load-bearing. When the parameter is absent the router
   * binds `undefined`, which overrides the declared default of '' — so
   * without this, visiting /search with no query throws on every read.
   */
  readonly q = input('', {
    transform: (value: string | undefined) => value ?? '',
  });

  /**
   * Query params always arrive as strings, and may be absent or nonsense
   * (?page=abc, ?page=-3). Anything unusable falls back to page 1 rather
   * than propagating NaN into a request.
   */
  readonly page = input(1, {
    transform: (value: string | number | undefined): number => {
      const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
      return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 1;
    },
  });

  private readonly query = computed(() => this.q().trim());

  /** One signal for the whole request, so either param triggers a refetch. */
  private readonly request = computed(() => ({
    query: this.query(),
    page: this.page(),
  }));

  readonly state = toSignal(
    toObservable(this.request).pipe(
      // The computed above builds a fresh object on every recompute, and
      // signals compare by reference — so the router setting `q` and `page`
      // in separate passes emits twice with identical values and fires two
      // identical requests. Compare by value instead.
      distinctUntilChanged((a, b) => a.query === b.query && a.page === b.page),
      // switchMap cancels the in-flight request when the query changes, so a
      // slow earlier response can never overwrite a newer one.
      switchMap(({ query, page }) => {
        if (!query) {
          return of<SearchState>({ status: 'idle' });
        }

        return this.api.search(query, page).pipe(
          switchMap((results) => of<SearchState>({ status: 'success', results })),
          startWith<SearchState>({ status: 'loading' }),
          catchError((error: LocApiError) =>
            of<SearchState>({ status: 'error', message: error.message }),
          ),
        );
      }),
    ),
    { initialValue: { status: 'idle' } as SearchState },
  );

  /** Narrows the union down to the one branch the results list cares about. */
  readonly results = computed(() => {
    const state = this.state();
    return state.status === 'success' ? state.results : null;
  });

  readonly status = computed(() => this.state().status);

  /**
   * Text for the live region. It is a single always-rendered element whose
   * content changes, because a live region that is added to the DOM at the
   * same moment its text appears is frequently not announced.
   */
  readonly statusMessage = computed(() => {
    const state = this.state();

    switch (state.status) {
      case 'idle':
        return '';
      case 'loading':
        return 'Searching…';
      case 'error':
        return state.message;
      case 'success': {
        // Emptiness is decided by what actually rendered, not by `total`:
        // LoC returns total: 1 alongside an empty results array for a query
        // that matched nothing, so the two would otherwise contradict.
        if (state.results.items.length === 0) {
          return `No results found for ${this.query()}.`;
        }
        const count = `${state.results.total.toLocaleString()} results found for ${this.query()}.`;
        return this.page() > 1 ? `${count} Page ${this.page()}.` : count;
      }
    }
  });

  /**
   * Navigating without a `page` param resets to page 1, which is what a new
   * search should do — landing on page 7 of a different query would be wrong.
   */
  onSearch(query: string): void {
    this.router.navigate(['/search'], { queryParams: { q: query } });
  }
}
