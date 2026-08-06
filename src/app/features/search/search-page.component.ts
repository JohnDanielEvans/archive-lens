import { Component, signal } from '@angular/core';

import { SearchFormComponent } from './search-form.component';

/**
 * Search results page. Phase 6 replaces the local signal below with the URL
 * query parameter, so a search can be shared or bookmarked.
 */
@Component({
  selector: 'app-search-page',
  imports: [SearchFormComponent],
  template: `
    <h2>Search the collection</h2>

    <app-search-form (search)="onSearch($event)" />

    @if (query(); as currentQuery) {
      <p>Searching for: {{ currentQuery }}</p>
    }
  `,
})
export class SearchPageComponent {
  readonly query = signal('');

  onSearch(query: string): void {
    this.query.set(query);
  }
}
