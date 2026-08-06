import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, of, startWith, switchMap } from 'rxjs';

import { SearchResults } from '../../core/models/collection-item.model';
import { LocApiError, LocApiService } from '../../core/services/loc-api.service';
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
  imports: [SearchFormComponent],
  templateUrl: './search-page.component.html',
  styles: `
    .results {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .results li {
      padding: 0.75rem 0;
      border-bottom: 1px solid #eee;
    }

    .error {
      padding: 0.75rem;
      color: #b3261e;
      border: 2px solid #b3261e;
      border-radius: 4px;
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
   */
  readonly q = input('');

  private readonly query = computed(() => this.q().trim());

  readonly state = toSignal(
    toObservable(this.query).pipe(
      // switchMap cancels the in-flight request when the query changes, so a
      // slow earlier response can never overwrite a newer one.
      switchMap((query) => {
        if (!query) {
          return of<SearchState>({ status: 'idle' });
        }

        return this.api.search(query).pipe(
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
      case 'success':
        return state.results.total === 0
          ? `No results found for ${this.query()}.`
          : `${state.results.total.toLocaleString()} results found for ${this.query()}.`;
    }
  });

  onSearch(query: string): void {
    this.router.navigate(['/search'], { queryParams: { q: query } });
  }
}
