import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Detail page for a single collection item.
 *
 * `id` is populated straight from the `:id` route parameter, because
 * `withComponentInputBinding()` is enabled in app.config.ts. The component
 * never touches ActivatedRoute — which keeps it testable as a plain component.
 */
@Component({
  selector: 'app-item-detail',
  imports: [RouterLink],
  template: `
    <h2>Item detail</h2>
    <p>Showing item: {{ id() }}</p>
    <a routerLink="/search">Back to search</a>
  `,
})
export class ItemDetailComponent {
  readonly id = input.required<string>();
}
