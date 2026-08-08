/**
 * Loaded before every spec.
 *
 * Every test stubs the Library of Congress API rather than calling it. Three
 * reasons, all of which came up while building the app:
 *
 *   1. LoC rate-limits hard, and answers with a Cloudflare challenge page that
 *      carries no CORS headers — so a throttled test fails as an opaque
 *      network error.
 *   2. Real results change, so assertions on titles would rot.
 *   3. CI should not depend on a third party being up.
 *
 * The stubs use payloads captured from real responses, so they keep the
 * inconsistencies the mapping layer exists to absorb.
 */

beforeEach(() => {
  // Saved items live in localStorage, so tests would otherwise leak state
  // into one another.
  cy.clearLocalStorage();
});
