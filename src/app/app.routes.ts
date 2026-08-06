import { Routes } from '@angular/router';

/**
 * Route table.
 *
 * `loadComponent` lazy-loads each page into its own bundle, so the initial
 * download only contains the shell. `title` is picked up by Angular's default
 * TitleStrategy, which sets document.title on navigation — screen readers
 * announce it, and it gives browser history meaningful entries.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'search',
  },
  {
    path: 'search',
    title: 'Search — Archive Lens',
    loadComponent: () =>
      import('./features/search/search-page.component').then(
        (m) => m.SearchPageComponent,
      ),
  },
  {
    path: 'item/:id',
    title: 'Item — Archive Lens',
    loadComponent: () =>
      import('./features/item-detail/item-detail.component').then(
        (m) => m.ItemDetailComponent,
      ),
  },
  {
    // Wildcard must be last — the router matches top to bottom and stops at
    // the first hit.
    path: '**',
    title: 'Page not found — Archive Lens',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];
