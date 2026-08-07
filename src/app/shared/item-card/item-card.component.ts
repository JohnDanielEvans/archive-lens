import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CollectionItem } from '../../core/models/collection-item.model';

/**
 * Presentational card for one collection item.
 *
 * It takes an item and renders it — no injected services, no data fetching,
 * no knowledge of where the item came from. That's what lets the saved-items
 * page reuse it unchanged, and what makes it testable without HTTP or routing
 * state.
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
  readonly item = input.required<CollectionItem>();

  /** Cards stay scannable; the detail page shows the full lists. */
  readonly topSubjects = computed(() => this.item().subjects.slice(0, 3));

  readonly contributorSummary = computed(() => {
    const contributors = this.item().contributors;
    if (contributors.length === 0) return null;
    if (contributors.length <= 2) return contributors.join(', ');
    return `${contributors.slice(0, 2).join(', ')} and ${contributors.length - 2} more`;
  });
}
