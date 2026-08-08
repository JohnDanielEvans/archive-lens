import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // withComponentInputBinding() feeds route params, query params and route
    // data straight into matching component inputs, so pages don't have to
    // inject ActivatedRoute.
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Scroll to the top on a new navigation, and restore the previous
      // position on Back — what a browser does for free on a normal site,
      // but which a router has to be told to do.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    // withFetch() uses the Fetch API instead of XMLHttpRequest — the modern
    // default, and required for anything streaming later.
    provideHttpClient(withFetch()),
  ],
};
