import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchFormComponent } from './search-form.component';

describe('SearchFormComponent', () => {
  let fixture: ComponentFixture<SearchFormComponent>;
  let component: SearchFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#search-query');
  }

  function submit(): void {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function setQuery(value: string): void {
    component.queryControl.setValue(value);
    fixture.detectChanges();
  }

  it('associates the label, hint and input', () => {
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');

    expect(label.getAttribute('for')).toBe('search-query');
    expect(input().id).toBe('search-query');
    expect(input().getAttribute('aria-describedby')).toBe('search-query-hint');
  });

  it('exposes a search landmark', () => {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    expect(form.getAttribute('role')).toBe('search');
  });

  it('shows no error before the user submits', () => {
    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
    expect(input().getAttribute('aria-invalid')).toBe('false');
  });

  it('emits the query when the form is valid', () => {
    const emitted: string[] = [];
    component.querySubmit.subscribe((query) => emitted.push(query));

    setQuery('lighthouse');
    submit();

    expect(emitted).toEqual(['lighthouse']);
  });

  it('trims the query before emitting', () => {
    const emitted: string[] = [];
    component.querySubmit.subscribe((query) => emitted.push(query));

    setQuery('  lighthouse  ');
    submit();

    expect(emitted).toEqual(['lighthouse']);
  });

  it('does not emit when the input fires its native search event', () => {
    // <input type="search"> fires a native `search` event on Enter and on the
    // clear button, and it bubbles to this component's host. If the output is
    // ever renamed back to `search`, a (search) binding on the host would
    // receive that Event instead of a query string.
    const emitted: string[] = [];
    component.querySubmit.subscribe((query) => emitted.push(query));

    setQuery('lighthouse');
    input().dispatchEvent(new Event('search', { bubbles: true }));
    fixture.detectChanges();

    expect(emitted).toEqual([]);
  });

  it('does not emit when the field is empty', () => {
    const emitted: string[] = [];
    component.querySubmit.subscribe((query) => emitted.push(query));

    submit();

    expect(emitted).toEqual([]);
  });

  it('rejects whitespace-only input that would satisfy minLength', () => {
    const emitted: string[] = [];
    component.querySubmit.subscribe((query) => emitted.push(query));

    setQuery('   ');
    submit();

    expect(emitted).toEqual([]);
    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'Enter a search term',
    );
  });

  it('rejects a single character', () => {
    setQuery('a');
    submit();

    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'at least 2 characters',
    );
  });

  it('marks the input invalid and points aria-describedby at the error', () => {
    submit();

    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBe(
      'search-query-hint search-query-error',
    );
    expect(fixture.nativeElement.querySelector('#search-query-error')).not.toBeNull();
  });

  it('moves focus to the field when submission fails', () => {
    submit();
    expect(document.activeElement).toBe(input());
  });

  it('clears the error once the input becomes valid', () => {
    submit();
    expect(fixture.nativeElement.querySelector('.error')).not.toBeNull();

    setQuery('lighthouse');

    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
    expect(input().getAttribute('aria-invalid')).toBe('false');
  });
});
