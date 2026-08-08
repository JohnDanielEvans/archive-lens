import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CollectionItem } from '../../core/models/collection-item.model';
import { SavedItemsService } from '../../core/services/saved-items.service';

/**
 * Card for one collection item.
 *
 * It fetches nothing: the item arrives as an input, so it works the same on
 * the search page and the saved page.
 *
 * It does inject SavedItemsService, which walks back the "no injected
 * services" line from when this component was written. Saved state is global,
 * not owned by whichever list happens to render the card, so passing a `saved`
 * input and a `toggle` output down through every list would be plumbing with
 * no benefit. DI keeps it testable — a spec gets a real service backed by a
 * clean localStorage.
 */
@Component({
  selector: 'app-item-card',
  imports: [RouterLink],
  templateUrl: './item-card.component.html',
  styleUrl: './item-card.component.scss',
  // Inputs are the component's only data source, so Angular can skip checking
  // this component entirely unless the item reference actually changes.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemCardComponent {
  private readonly savedItems = inject(SavedItemsService);

  readonly item = input.required<CollectionItem>();

  readonly isSaved = computed(() => this.savedItems.isSaved(this.item().id));

  toggleSaved(): void {
    this.savedItems.toggle(this.item());
  }

  /** Cards stay scannable; the detail page shows the full lists. */
  readonly topSubjects = computed(() => this.item().subjects.slice(0, 3));

  readonly contributorSummary = computed(() => {
    const contributors = this.item().contributors;
    if (contributors.length === 0) return null;
    if (contributors.length <= 2) return contributors.join(', ');
    return `${contributors.slice(0, 2).join(', ')} and ${contributors.length - 2} more`;
  });
}
