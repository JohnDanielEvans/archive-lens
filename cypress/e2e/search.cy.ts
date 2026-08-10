/**
 * The search journey, end to end through the real app with the API stubbed.
 */

const SEARCH_API = 'https://www.loc.gov/search/*';

describe('Searching the collection', () => {
  it('starts on the landing hero and makes no request', () => {
    cy.intercept('GET', SEARCH_API, cy.spy().as('searchRequest'));

    cy.visit('/search');

    cy.contains('Two centuries of American memory').should('be.visible');
    cy.get('.suggestions__list a').should('have.length.greaterThan', 0);
    cy.get('@searchRequest').should('not.have.been.called');
  });

  it('runs a search from a suggestion chip', () => {
    cy.intercept('GET', SEARCH_API, { fixture: 'search-lighthouse.json' }).as('search');

    cy.visit('/search');
    cy.contains('.suggestions__list a', 'lighthouses').click();

    cy.location('search').should('eq', '?q=lighthouses');
    cy.wait('@search');
    cy.get('.hero').should('not.exist');
    cy.get('app-item-card').should('have.length', 2);
  });

  it('puts the query in the URL and renders results', () => {
    cy.intercept('GET', SEARCH_API, { fixture: 'search-lighthouse.json' }).as('search');

    cy.visit('/search');
    cy.get('#search-query').type('lighthouse');
    cy.contains('button', 'Search').click();

    // The URL is the source of truth, so it must change before results appear.
    cy.location('search').should('eq', '?q=lighthouse');
    cy.wait('@search').its('request.url').should('include', 'q=lighthouse');

    cy.get('app-item-card').should('have.length', 2);
    cy.contains('Legendary lighthouses').should('be.visible');
    cy.contains('9,110 results found').should('be.visible');
  });

  it('drops records that have no item page', () => {
    // The third fixture record is a research-centre page with no /item/ URL,
    // so there is nowhere for a card to link to.
    cy.intercept('GET', SEARCH_API, { fixture: 'search-lighthouse.json' }).as('search');

    cy.visit('/search?q=lighthouse');
    cy.wait('@search');

    cy.contains('Geography and Map Reading Room').should('not.exist');
  });

  it('recovers the item id from aka when the id is a catalogue URL', () => {
    cy.intercept('GET', SEARCH_API, { fixture: 'search-lighthouse.json' }).as('search');

    cy.visit('/search?q=lighthouse');
    cy.wait('@search');

    cy.contains('a', 'Legendary lighthouses').should(
      'have.attr',
      'href',
      '/item/2003557451',
    );
  });

  it('is shareable: loading the URL directly runs the same search', () => {
    cy.intercept('GET', SEARCH_API, { fixture: 'search-lighthouse.json' }).as('search');

    cy.visit('/search?q=lighthouse');
    cy.wait('@search');

    cy.get('#search-query').should('have.value', 'lighthouse');
    cy.get('app-item-card').should('have.length', 2);
  });

  it('explains an empty result set', () => {
    cy.intercept('GET', SEARCH_API, { fixture: 'search-empty.json' }).as('search');

    cy.visit('/search?q=qwzkxjvlmnptrbdf');
    cy.wait('@search');

    cy.contains('No results found').should('be.visible');
    cy.contains('Check the spelling').should('be.visible');
    cy.get('app-item-card').should('not.exist');
  });

  it('shows a readable message when the API fails', () => {
    cy.intercept('GET', SEARCH_API, {
      statusCode: 503,
      body: 'upstream exploded',
    }).as('search');

    cy.visit('/search?q=lighthouse');
    cy.wait('@search');

    cy.contains('not responding').should('be.visible');
    // Whatever the upstream said must never reach the page.
    cy.contains('upstream exploded').should('not.exist');
  });

  it('announces state changes in a live region', () => {
    cy.intercept('GET', SEARCH_API, { fixture: 'search-lighthouse.json' }).as('search');

    cy.visit('/search?q=lighthouse');
    cy.wait('@search');

    cy.get('[role="status"]').should(
      'contain.text',
      '9,110 results found for lighthouse',
    );
  });

  it('pages forward and keeps the query', () => {
    cy.intercept('GET', SEARCH_API, { fixture: 'search-lighthouse.json' }).as('search');

    cy.visit('/search?q=lighthouse');
    cy.wait('@search');

    cy.contains('a', 'Next page').click();

    cy.location('search').should('eq', '?q=lighthouse&page=2');
    cy.wait('@search').its('request.url').should('include', 'sp=2');
  });
});

/** Width of the element's box, used to tell "clipped away" from "on screen". */
function widthOf(selector: string): Cypress.Chainable<number> {
  return cy.get(selector).then(($el) => $el[0].getBoundingClientRect().width);
}

describe('Keyboard access', () => {
  it('reveals a skip link that moves focus into the main content', () => {
    cy.visit('/search');

    // Not `should('not.be.visible')`: Cypress only treats display:none,
    // visibility:hidden or a zero-size box as hidden, and the visually-hidden
    // pattern deliberately keeps a 1px box so the link stays focusable and in
    // the accessibility tree. Measuring the box is the honest check.
    widthOf('.skip-link').should('be.lessThan', 2);

    cy.get('.skip-link').focus();
    widthOf('.skip-link').should('be.greaterThan', 50);

    cy.get('.skip-link').click();
    cy.focused().should('have.attr', 'id', 'main-content');
  });

  it('moves focus to the main content after navigating', () => {
    cy.intercept('GET', SEARCH_API, { fixture: 'search-lighthouse.json' }).as('search');
    // A single * does not cross a / in Cypress glob matching, and the real URL
    // is /item/{id}/?fo=json — so this needs ** or a regex.
    cy.intercept('GET', 'https://www.loc.gov/item/**', {
      fixture: 'item-biloxi.json',
    }).as('item');

    cy.visit('/search?q=lighthouse');
    cy.wait('@search');

    cy.contains('a', 'Lighthouse, Biloxi, Mississippi').click();
    cy.wait('@item');

    // Without this, a keyboard user would still be at the card they clicked.
    cy.focused().should('have.attr', 'id', 'main-content');
  });
});
