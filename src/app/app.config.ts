import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // withComponentInputBinding() feeds route params, query params and route
    // data straight into matching component inputs, so pages don't have to
    // inject ActivatedRoute.
    provideRouter(routes, withComponentInputBinding()),
    // withFetch() uses the Fetch API instead of XMLHttpRequest — the modern
    // default, and required for anything streaming later.
    provideHttpClient(withFetch()),
  ],
};
