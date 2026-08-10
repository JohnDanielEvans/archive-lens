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
    /* ---- Landing state ------------------------------------------------- */

    /* A soft wash instead of an image: no extra request, no layout shift, and
       nothing to go stale.

       Painted on the element rather than an absolutely-positioned ::before.
       The earlier version used a negative horizontal inset to bleed past the
       content column, which had nothing clipping it and pushed the page wider
       than the viewport. A background is bounded by its own box, so it cannot.
       (Note: no backticks in here — these styles live in a template literal.) */
    .hero {
      padding: clamp(2rem, 7vw, 4.5rem) 1rem clamp(2rem, 5vw, 3rem);
      text-align: center;
      background:
        radial-gradient(70% 55% at 50% 25%, rgb(13 92 99 / 9%), transparent 72%),
        radial-gradient(50% 45% at 78% 15%, rgb(138 51 36 / 6%), transparent 72%);
    }

    .hero__eyebrow {
      margin: 0 0 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    .hero__title {
      max-width: 18ch;
      margin: 0 auto 1rem;
      font-size: clamp(2.125rem, 6vw, 3.5rem);
      line-height: 1.05;
      letter-spacing: -0.03em;
    }

    .hero__lede {
      max-width: 34rem;
      margin: 0 auto clamp(1.75rem, 4vw, 2.5rem);
      font-size: clamp(1rem, 2.2vw, 1.125rem);
      color: var(--ink-muted);
      text-wrap: pretty;
    }

    .suggestions {
      margin-top: 2rem;
    }

    .suggestions__label {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      color: var(--ink-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .suggestions__list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
      padding: 0;
      margin: 0;
      list-style: none;
    }

    .suggestions__list a {
      display: inline-block;
      padding: 0.4375rem 1rem;
      font-size: 0.875rem;
      color: var(--ink);
      text-decoration: none;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 999px;
      transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        transform 0.15s ease;
    }

    .suggestions__list a:hover {
      color: var(--accent);
      background: var(--accent-wash);
      border-color: var(--accent);
      transform: translateY(-1px);
    }

    /* ---- Results state -------------------------------------------------- */

    .search-bar {
      padding-bottom: 1.5rem;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .loading {
      display: flex;
      gap: 0.625rem;
      align-items: center;
      margin: 2rem 0 0;
      font-size: 1.0625rem;
      color: var(--ink-muted);
    }

    .loading {
      display: flex;
      gap: 0.625rem;
      align-items: center;
    }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(1turn);
      }
    }

    /* A frozen ring reads as a rendering bug, so drop it entirely and let the
       text and placeholders carry the message. */
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        display: none;
      }
    }

    .skeletons {
      /* Hold the skeletons back briefly. Most responses arrive fast enough
         that showing them immediately is just a flicker. */
      animation: fade-in 0.2s ease 0.15s both;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    .skeleton-card {
      display: flex;
      gap: 1rem;
      height: 100%;
      padding: 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    .skeleton-card__body {
      flex: 1;
    }

    .skeleton {
      background: linear-gradient(90deg, #ece9e3 25%, #f6f4f0 37%, #ece9e3 63%);
      background-size: 400% 100%;
      border-radius: 4px;
      animation: shimmer 1.4s ease-in-out infinite;
    }

    @keyframes shimmer {
      from {
        background-position: 100% 50%;
      }

      to {
        background-position: 0% 50%;
      }
    }

    .skeleton--thumb {
      flex: 0 0 5.5rem;
      width: 5.5rem;
      height: 5.5rem;
      border-radius: var(--radius-sm);
    }

    .skeleton--title {
      width: 70%;
      height: 1.0625rem;
      margin-bottom: 0.625rem;
    }

    .skeleton--line {
      height: 0.75rem;
      margin-bottom: 0.4375rem;
    }

    .skeleton--short {
      width: 55%;
    }

    .skeleton--chips {
      width: 65%;
      height: 1.125rem;
      margin-top: 0.875rem;
      border-radius: 999px;
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

  /** Placeholder cards shown while a search is in flight. */
  readonly skeletons = Array.from({ length: 6 });

  /**
   * Starting points for the landing page. An empty search box is a hard place
   * to begin with an archive this broad. Each was checked against the live API
   * for a healthy number of results, most of them with images.
   */
  readonly suggestions = [
    'lighthouses',
    'civil war',
    'jazz',
    'railroads',
    'national parks',
    "world's fair",
  ] as const;

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
