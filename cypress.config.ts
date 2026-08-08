import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    // Nothing here needs recording; screenshots on failure are enough.
    video: false,
    viewportWidth: 1280,
    viewportHeight: 900,
  },
});
