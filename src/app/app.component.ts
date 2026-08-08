import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly router = inject(Router);

  private readonly mainContent = viewChild.required<ElementRef<HTMLElement>>('mainContent');

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        // Skip the first navigation. On a fresh page load focus already
        // belongs at the top of the document, and moving it would drop the
        // user past the header they never saw.
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        // In a multi-page site a navigation resets focus to the document.
        // A router swaps DOM without touching focus, so a keyboard user is
        // left wherever they clicked — at the bottom of the previous page
        // after using "Next page", for instance. Moving focus to <main>
        // restores the behaviour people already expect from the web.
        this.mainContent().nativeElement.focus();
      });
  }
}
