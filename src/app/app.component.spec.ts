import { Component } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

@Component({ template: '<a href="#" id="a-link">a</a>' })
class StubPageComponent {}

/**
 * These specs assert the shell's landmark and skip-link structure, so that
 * the accessibility contract can't be broken silently by a later refactor.
 */
describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      // routerLink needs a Router instance; an empty route table is enough
      // because these specs only assert structure, never navigation.
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render exactly one h1 naming the application', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const headings = fixture.nativeElement.querySelectorAll('h1');

    expect(headings.length).toBe(1);
    expect(headings[0].textContent?.trim()).toBe('Archive Lens');
  });

  it('should expose a main landmark that can receive programmatic focus', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const main = fixture.nativeElement.querySelector('main');

    expect(main).withContext('a <main> element must exist').toBeTruthy();
    expect(main.id).withContext('<main> needs an id for the skip link').toBeTruthy();
    expect(main.getAttribute('tabindex'))
      .withContext('<main> needs tabindex="-1" so focus can move to it')
      .toBe('-1');
  });

  it('should have a skip link pointing at the main landmark', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const skipLink = fixture.nativeElement.querySelector('a.skip-link');
    const main = fixture.nativeElement.querySelector('main');

    expect(skipLink).withContext('a.skip-link must exist').toBeTruthy();
    expect(skipLink.getAttribute('href')).toBe(`#${main.id}`);
  });

  it('should render the router outlet inside the main landmark', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const outlet = fixture.nativeElement.querySelector('main router-outlet');

    expect(outlet)
      .withContext('<router-outlet /> must be inside <main>, not a sibling')
      .toBeTruthy();
  });
});

/**
 * A router swaps DOM without moving focus, so a keyboard user stays wherever
 * they clicked — at the bottom of the previous page after "Next page", for
 * instance. The shell restores the behaviour a multi-page site gets free.
 */
describe('AppComponent focus management', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'one', component: StubPageComponent },
          { path: 'two', component: StubPageComponent },
        ]),
      ],
    }).compileComponents();
  });

  it('does not steal focus on the first navigation', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    TestBed.inject(Router).navigate(['/one']);
    tick();
    fixture.detectChanges();

    const main = fixture.nativeElement.querySelector('main');
    expect(document.activeElement).not.toBe(main);
  }));

  it('moves focus to main on subsequent navigations', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);

    router.navigate(['/one']);
    tick();
    fixture.detectChanges();

    router.navigate(['/two']);
    tick();
    fixture.detectChanges();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('main'));
  }));
});
