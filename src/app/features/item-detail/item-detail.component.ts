import { Component, computed, effect, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, of, startWith, switchMap } from 'rxjs';

import { CollectionItemDetail } from '../../core/models/collection-item.model';
import { LocApiError, LocApiService } from '../../core/services/loc-api.service';

/**
 * There is no idle state here: unlike search, the route always carries an id,
 * so the component is either loading, showing an item, or explaining a failure.
 */
type DetailState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly item: CollectionItemDetail }
  | { readonly status: 'error'; readonly message: string };

@Component({
  selector: 'app-item-detail',
  imports: [RouterLink],
  templateUrl: './item-detail.component.html',
  styles: `
    .back {
      display: inline-block;
      margin-bottom: 1.5rem;
      font-size: 0.9375rem;
      color: var(--accent);
    }

    h2 {
      margin: 0 0 1rem;
      font-size: clamp(1.5rem, 4vw, 2rem);
    }

    /* Flex rather than grid: LoC thumbnails are only ~150px, and an auto-fit
       grid would give the image a half-width column with a large empty gap
       beside it. */
    .layout {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
      align-items: flex-start;
    }

    figure {
      flex: 0 0 auto;
      max-width: 20rem;
      margin: 0;
    }

    .details {
      flex: 1 1 20rem;
      min-width: 0;
    }

    figure img {
      max-width: 100%;
      background: var(--accent-wash);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    figcaption {
      margin-top: 0.5rem;
      font-size: 0.8125rem;
      color: var(--ink-muted);
    }

    .summary {
      margin: 0 0 1.5rem;
      font-size: 1.0625rem;
    }

    dl {
      display: grid;
      grid-template-columns: minmax(6rem, max-content) 1fr;
      gap: 0.5rem 1.5rem;
      margin: 0 0 1.5rem;
    }

    dt {
      font-size: 0.8125rem;
      color: var(--ink-muted);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    dd {
      margin: 0;
    }

    h3 {
      margin: 1.5rem 0 0.5rem;
      font-size: 1.0625rem;
    }

    .subjects {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      padding: 0;
      margin: 0;
      list-style: none;
    }

    .subjects li {
      padding: 0.1875rem 0.5rem;
      font-size: 0.75rem;
      color: var(--accent);
      background: var(--accent-wash);
      border-radius: 999px;
    }

    .notes {
      padding-left: 1.25rem;
      margin: 0;
      color: var(--ink-muted);
    }

    .source {
      display: inline-block;
      margin-top: 2rem;
      font-weight: 600;
      color: var(--accent);
    }

    .error {
      max-width: 40rem;
      padding: 1.25rem 1.5rem;
      color: var(--error);
      background: var(--error-wash);
      border: 1px solid currentcolor;
      border-radius: var(--radius);
    }

    .loading {
      display: flex;
      gap: 0.625rem;
      align-items: center;
      color: var(--ink-muted);
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

    /* A frozen ring reads as a rendering bug, so drop it and let the text
       carry the message. */
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        display: none;
      }
    }
  `,
})
export class ItemDetailComponent {
  private readonly api = inject(LocApiService);
  private readonly title = inject(Title);

  /** Bound from the `:id` route parameter by withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly state = toSignal(
    toObservable(this.id).pipe(
      distinctUntilChanged(),
      switchMap((id) =>
        this.api.getItem(id).pipe(
          switchMap((item) => of<DetailState>({ status: 'success', item })),
          startWith<DetailState>({ status: 'loading' }),
          catchError((error: LocApiError) =>
            of<DetailState>({ status: 'error', message: error.message }),
          ),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as DetailState },
  );

  readonly status = computed(() => this.state().status);

  readonly item = computed(() => {
    const state = this.state();
    return state.status === 'success' ? state.item : null;
  });

  readonly statusMessage = computed(() => {
    const state = this.state();
    switch (state.status) {
      case 'loading':
        return 'Loading item…';
      case 'error':
        return state.message;
      case 'success':
        return `${state.item.title}. Item details loaded.`;
    }
  });

  constructor() {
    // The route's static title is a placeholder; once the item is known the
    // real one is more useful in the tab, in history, and to screen readers,
    // which announce the document title on navigation.
    effect(() => {
      const item = this.item();
      this.title.setTitle(item ? `${item.title} — Archive Lens` : 'Item — Archive Lens');
    });
  }
}
