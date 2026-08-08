import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
  });

  it('explains what happened under a heading', () => {
    const heading: HTMLElement = fixture.nativeElement.querySelector('h2');

    expect(heading.textContent).toContain('Page not found');
  });

  it('offers a route back into the app', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');

    expect(link.getAttribute('href')).toBe('/search');
    expect(link.textContent).toContain('search');
  });
});
