import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SavedItemsService } from '../../core/services/saved-items.service';
import { ItemCardComponent } from '../../shared/item-card/item-card.component';

@Component({
  selector: 'app-saved-page',
  imports: [ItemCardComponent, RouterLink],
  templateUrl: './saved-page.component.html',
  styles: `
    h2 {
      margin: 0 0 1.5rem;
      font-size: clamp(1.75rem, 4vw, 2.25rem);
    }

    .count {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      color: var(--ink-muted);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .results {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(20rem, 100%), 1fr));
      gap: 1rem;
      padding: 0;
      margin: 0;
      list-style: none;
    }

    .empty {
      max-width: 40rem;
      padding: 1.25rem 1.5rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
    }

    .empty p {
      margin: 0 0 0.5rem;
    }

    .empty p:last-child {
      margin: 0;
    }

    .empty a {
      color: var(--accent);
    }
  `,
})
export class SavedPageComponent {
  private readonly savedItems = inject(SavedItemsService);

  readonly items = this.savedItems.items;
  readonly count = this.savedItems.count;
}
