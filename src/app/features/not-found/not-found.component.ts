import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h2>Page not found</h2>
    <p>That page doesn't exist. Try searching the collection instead.</p>
    <a routerLink="/search">Go to search</a>
  `,
})
export class NotFoundComponent {}
