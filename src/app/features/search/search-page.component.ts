import { Component } from '@angular/core';

/**
 * Search results page. The form and results land in Phases 5-7; for now this
 * exists so the route has something to render.
 *
 * The template is inline because it's a few lines. Angular's convention is to
 * split into templateUrl once a template outgrows roughly 10-15 lines.
 */
@Component({
  selector: 'app-search-page',
  template: `
    <h2>Search the collection</h2>
    <p>The search form will live here.</p>
  `,
})
export class SearchPageComponent {}
