/**
 * Saving items, which is the only state the app keeps between visits.
 */

const SEARCH_API = 'https://www.loc.gov/search/*';

function stubSearch(): void {
  cy.intercept('GET', SEARCH_API, { fixture: 'search-lighthouse.json' }).as('search');
}

describe('Saving items', () => {
  it('explains itself when nothing is saved', () => {
    cy.visit('/saved');

    cy.contains("haven't saved anything yet").should('be.visible');
    cy.get('app-item-card').should('not.exist');
  });

  it('saves from a result card and shows it on the saved page', () => {
    stubSearch();
    cy.visit('/search?q=lighthouse');
    cy.wait('@search');

    cy.contains('app-item-card', 'Legendary lighthouses')
      .find('.card__save')
      .click()
      .should('have.attr', 'aria-pressed', 'true')
      .and('contain.text', 'Saved');

    cy.get('nav .badge').should('have.text', '1');

    cy.contains('nav a', 'Saved').click();
    cy.contains('1 saved item').should('be.visible');
    cy.contains('app-item-card', 'Legendary lighthouses').should('be.visible');
  });

  it('keeps saved items across a reload', () => {
    stubSearch();
    cy.visit('/search?q=lighthouse');
    cy.wait('@search');

    cy.contains('app-item-card', 'Legendary lighthouses').find('.card__save').click();

    // A full page load, so this only passes if the list really was persisted.
    cy.visit('/saved');

    cy.contains('app-item-card', 'Legendary lighthouses').should('be.visible');
    cy.get('nav .badge').should('have.text', '1');
  });

  it('unsaves from the saved page and empties the list', () => {
    stubSearch();
    cy.visit('/search?q=lighthouse');
    cy.wait('@search');
    cy.contains('app-item-card', 'Legendary lighthouses').find('.card__save').click();

    cy.visit('/saved');
    cy.get('.card__save').click();

    cy.get('app-item-card').should('not.exist');
    cy.contains("haven't saved anything yet").should('be.visible');
    cy.get('nav .badge').should('not.exist');
  });

  it('starts empty when stored data is unusable', () => {
    cy.visit('/saved', {
      onBeforeLoad(win) {
        win.localStorage.setItem('archive-lens.saved-items.v1', 'not json at all');
      },
    });

    cy.contains("haven't saved anything yet").should('be.visible');
  });
});

describe('Unknown pages', () => {
  it('shows a 404 page with a way back', () => {
    cy.visit('/no-such-page');

    cy.contains('Page not found').should('be.visible');
    cy.contains('a', 'Go to search').click();
    cy.location('pathname').should('eq', '/search');
  });
});
