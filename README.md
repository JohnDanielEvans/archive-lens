# Archive Lens

An accessible Angular app for searching the [Library of Congress](https://www.loc.gov/apis/)
public collections.

**Live: [archive-lens.pages.dev](https://archive-lens.pages.dev)**

Built as a learning project, with an emphasis on accessibility as a design
constraint rather than a cleanup pass, and on handling a real third-party API
that does not behave the way its documentation implies.

## Running it

```bash
npm install
npm start          # http://localhost:4200
```

| Command | What it does |
| --- | --- |
| `npm start` | Dev server |
| `npm run build` | Production build to `dist/archive-lens/browser` |
| `npm run test:ci` | Unit tests, headless, single run |
| `npm run test:coverage` | Unit tests with a coverage report in `coverage/` |
| `npm run e2e` | Boots the dev server and runs Cypress against it |
| `npm run cy:open` | Cypress interactive runner (needs `npm start` already running) |

Node 22 (see `.nvmrc`). Newer versions mostly work but the Angular CLI warns.

## Architecture

```
src/app/
  app.component.*          Shell: landmarks, skip link, nav, focus management
  app.config.ts            Composition root — every provider the app uses
  app.routes.ts            Route table, all pages lazy-loaded
  core/
    models/                DTO types, domain types, and the mapping between them
    services/              LocApiService (HTTP), SavedItemsService (persistence)
  features/
    search/                Search page and its reactive form
    item-detail/           Single item view
    saved/                 Saved items list
    not-found/             404
  shared/
    item-card/             Presentational card, reused by search and saved
```

### The API boundary

The Library of Congress API is inconsistent in ways that matter, all verified
against live responses rather than assumed:

- `type` is usually `string[]` but is sometimes a bare `string`.
- `summary` is a string on photograph records and an **array** on catalogue
  records.
- `image_url` is present but empty for roughly 60% of results.
- `id` is usually a `lccn.loc.gov` catalogue URL, not an item URL. The real
  item URL is in an `aka` array. Reading `id` alone discards about 60% of
  results.
- `pagination.total` under-reports — pages beyond `total / perpage` still
  return real records — and `pagination.last` disagrees with both.
- A search matching nothing returns `results: []` alongside `total: 1`.

So there are two type layers. `LocSearchResultDto` and `LocItemDto` describe
what the API actually sends: nearly every field optional, and single-or-array
where that is what happens. `CollectionItem`, `CollectionItemDetail` and
`SearchResults` are total types where absence is `null` or an empty array.
`loc-mappers.ts` converts between them and is the only module that knows the
API is untidy — no component ever imports a DTO.

Pagination uses the API's own `next`/`previous` links rather than a page count
derived from `total`, because `total` is not trustworthy.

### State

- **Search state** lives in the URL. Submitting the form navigates rather than
  fetching; `?q=` and `?page=` are bound to component inputs by
  `withComponentInputBinding()`, and those drive the request. Searches are
  therefore shareable, and Back works.
- **Request state** is a discriminated union (`idle | loading | success |
  error`), so the template cannot read results in a state where there are
  none. `switchMap` cancels superseded requests, so a slow response can't
  overwrite a newer one.
- **Saved items** live in a signal mirrored to `localStorage` by an `effect`.
  The whole record is stored rather than just an id, so the saved page renders
  instantly and works offline; the trade is a possibly stale copy. Nothing read
  back from storage is trusted until validated.
- **Errors** are translated once, at the service boundary, into a `LocApiError`
  carrying a message that is safe to render. No component inspects an
  `HttpErrorResponse`, and upstream error text never reaches the screen.

### Accessibility

Not a checklist applied at the end — several decisions here shaped the code:

- Skip link targeting `<main tabindex="-1">`. The `tabindex` is required:
  a fragment link scrolls but does not move focus unless the target is
  focusable.
- Focus moves to `<main>` on navigation. A router swaps DOM without touching
  focus, so without this a keyboard user stays at the bottom of the previous
  page after pressing "Next page".
- One persistent `role="status"` live region per page, never conditionally
  rendered — a live region added at the same moment as its text is usually not
  announced. Visible equivalents are `aria-hidden` so nothing is read twice.
- The form associates label, hint and error, and `aria-describedby` only points
  at the error while it is on screen. A failed submit moves focus to the field.
- Save controls are toggle buttons with `aria-pressed`, each containing a
  visually hidden item title — otherwise a screen reader announces "Save,
  toggle button" 25 times with no way to tell them apart.
- Card thumbnails use `alt=""`. The API supplies no alternative text, and
  inventing a description of a photograph nobody has seen is worse than none;
  the title and summary carry the information in text.
- All colour pairings measured, lowest is 6.2:1 against a 4.5:1 requirement.
  `prefers-reduced-motion` is honoured.

### Testing

- **133 unit specs**, 100% coverage. Karma + Jasmine, running in a real
  browser — which is why the focus and `localStorage` specs need no mocks.
  `HttpTestingController` means no spec touches the network.
- **17 Cypress specs** covering search, paging, saving, error states and
  keyboard access. Every test stubs the API with fixtures captured from real
  responses: LoC rate-limits aggressively, and CI should not depend on a third
  party being reachable. The fixtures keep the API's odd shapes, so the mapping
  layer is genuinely exercised.

## Deployment

Deployed to Cloudflare Pages at
[archive-lens.pages.dev](https://archive-lens.pages.dev). Pushes to `main` run
the full suite and then deploy; pull requests are verified but not deployed. The
deploy uploads the exact artifact that passed, rather than rebuilding.

Every deployment also gets an immutable `<hash>.archive-lens.pages.dev` URL, so
a specific build can be linked to or compared against another. The bare
`archive-lens.pages.dev` alias always points at the latest production deploy.

`public/_redirects` sends every unmatched path to `index.html` with a 200.
Without it, only `/` exists as a real file and any deep link or refresh on
`/item/123` would 404.

### One-time setup

The workflow needs two repository secrets, and a Pages project that already
exists:

1. Create a Cloudflare Pages project named `archive-lens` (direct upload, not
   a Git connection — the workflow does the uploading).
2. Create an API token with the **Cloudflare Pages: Edit** permission.
3. Add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
