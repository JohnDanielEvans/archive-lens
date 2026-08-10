import {
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

/**
 * Rejects values that are empty once trimmed. Validators.minLength counts
 * characters, so "  " would otherwise pass a minLength(2) check.
 */
function nonBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim().length > 0 ? null : { required: true };
}

@Component({
  selector: 'app-search-form',
  imports: [ReactiveFormsModule],
  templateUrl: './search-form.component.html',
  // A host class rather than a second template: the markup and behaviour are
  // identical in both places, only the scale changes.
  host: {
    '[class.is-hero]': "variant() === 'hero'",
  },
  styles: `
    form {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: flex-end;
      max-width: 44rem;
    }

    .field {
      display: flex;
      flex: 1 1 18rem;
      flex-direction: column;
    }

    label {
      font-size: 0.9375rem;
      font-weight: 600;
    }

    .hint {
      margin: 0.125rem 0 0.5rem;
      font-size: 0.875rem;
      color: var(--ink-muted);
    }

    input {
      padding: 0.625rem 0.875rem;
      font: inherit;
      color: var(--ink);
      background: var(--surface);
      border: 1px solid #b4afa6;
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-sm);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    input:hover {
      border-color: var(--ink-muted);
    }

    input[aria-invalid='true'] {
      border-color: var(--error);
      border-width: 2px;
    }

    .error {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--error);
    }

    button {
      padding: 0.625rem 1.5rem;
      font: inherit;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      background: var(--accent);
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-sm);
      transition: background-color 0.15s ease;
    }

    button:hover {
      background: var(--accent-strong);
    }

    /* :host() with a class selects the component's own element when it carries
       that class — how a parent-chosen variant reaches scoped styles without
       ::ng-deep. */
    :host(.is-hero) {
      display: block;
      max-width: 38rem;
      margin-inline: auto;
    }

    :host(.is-hero) form {
      gap: 0.5rem;
      max-width: none;
    }

    :host(.is-hero) .field {
      flex-basis: 14rem;
    }

    :host(.is-hero) label {
      font-size: 0.75rem;
      color: var(--ink-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    :host(.is-hero) .hint {
      margin-bottom: 0.625rem;
    }

    :host(.is-hero) input {
      padding: 0.9375rem 1.25rem;
      font-size: 1.0625rem;
      border-radius: 999px;
    }

    :host(.is-hero) button {
      padding: 0.9375rem 2rem;
      font-size: 1.0625rem;
      border-radius: 999px;
    }
  `,
})
export class SearchFormComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  /**
   * Seed value, supplied by the page from the URL. Keeps the field populated
   * on reload, on a shared link, and when the user presses Back.
   */
  readonly initialQuery = input('');

  /** 'hero' renders the landing-page treatment; everything else is compact. */
  readonly variant = input<'default' | 'hero'>('default');

  /**
   * Emits the trimmed query when the form is submitted and valid.
   *
   * Deliberately NOT named `search`: <input type="search"> fires a native
   * `search` event on Enter and on the clear button, that event bubbles to
   * this component's host element, and a `(search)` binding on the host
   * receives it alongside the real output — handing the parent an Event
   * object instead of a query string.
   */
  readonly querySubmit = output<string>();

  private readonly queryInput =
    viewChild.required<ElementRef<HTMLInputElement>>('queryInput');

  readonly form = this.formBuilder.group({
    query: this.formBuilder.control('', [nonBlank, Validators.minLength(2)]),
  });

  /** Errors stay hidden until the user has actually tried something. */
  private readonly submitted = signal(false);

  constructor() {
    // Runs whenever initialQuery changes — including Back/Forward navigation,
    // which alters the URL without recreating the component.
    effect(() => {
      this.form.controls.query.setValue(this.initialQuery());
    });
  }

  get queryControl() {
    return this.form.controls.query;
  }

  get showError(): boolean {
    return this.queryControl.invalid && (this.submitted() || this.queryControl.touched);
  }

  get errorMessage(): string | null {
    if (!this.showError) return null;

    const errors = this.queryControl.errors;
    if (errors?.['required']) return 'Enter a search term.';
    if (errors?.['minlength']) return 'Search terms must be at least 2 characters.';
    return 'Enter a valid search term.';
  }

  /**
   * The hint is always announced; the error is added to the description only
   * while it is on screen, so aria-describedby never points at a missing id.
   */
  get describedBy(): string {
    return this.showError ? 'search-query-hint search-query-error' : 'search-query-hint';
  }

  onSubmit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      // Move focus to the field so the error is announced and the user is
      // already where the correction has to happen.
      this.queryInput().nativeElement.focus();
      return;
    }

    this.querySubmit.emit(this.queryControl.value.trim());
  }
}
