import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
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
  styles: `
    form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      flex: 1 1 20rem;
    }

    label {
      font-weight: 600;
    }

    .hint {
      margin: 0.125rem 0 0.375rem;
      font-size: 0.875rem;
      color: #555;
    }

    input {
      padding: 0.5rem;
      font: inherit;
      border: 1px solid #767676;
      border-radius: 4px;
    }

    input[aria-invalid='true'] {
      border-color: #b3261e;
      border-width: 2px;
    }

    .error {
      margin: 0.375rem 0 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #b3261e;
    }

    button {
      padding: 0.5rem 1.25rem;
      font: inherit;
      color: #fff;
      background: #0b5fff;
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: pointer;
    }

    button:hover {
      background: #0a4fd6;
    }
  `,
})
export class SearchFormComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  /** Emits the trimmed query when the form is submitted and valid. */
  readonly search = output<string>();

  private readonly queryInput =
    viewChild.required<ElementRef<HTMLInputElement>>('queryInput');

  readonly form = this.formBuilder.group({
    query: this.formBuilder.control('', [nonBlank, Validators.minLength(2)]),
  });

  /** Errors stay hidden until the user has actually tried something. */
  private readonly submitted = signal(false);

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

    this.search.emit(this.queryControl.value.trim());
  }
}
