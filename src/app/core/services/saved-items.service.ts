import { Injectable, computed, effect, signal } from '@angular/core';

import { CollectionItem } from '../models/collection-item.model';

/** Versioned, so a future shape change can't collide with old stored data. */
const STORAGE_KEY = 'archive-lens.saved-items.v1';

/**
 * Anything can end up in localStorage — data written by an older build, or
 * edited by hand. Nothing is trusted until it has been checked.
 */
function isCollectionItem(value: unknown): value is CollectionItem {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['id'] === 'string' &&
    typeof candidate['title'] === 'string' &&
    typeof candidate['url'] === 'string'
  );
}

/**
 * Saved items, held in a signal and mirrored to localStorage.
 *
 * The whole CollectionItem is stored, not just its id. That means the saved
 * page renders instantly and works offline, at the cost of showing a stale
 * copy if the record changes upstream. For a read-only archive browser that
 * trade is worth it; storing ids alone would mean N requests on page load.
 */
@Injectable({ providedIn: 'root' })
export class SavedItemsService {
  private readonly saved = signal<readonly CollectionItem[]>(readFromStorage());

  /** Read-only to callers: changes have to go through the methods below. */
  readonly items = this.saved.asReadonly();

  readonly count = computed(() => this.saved().length);

  constructor() {
    // Persistence as a side effect of state, rather than something every
    // mutator has to remember to do.
    effect(() => {
      const items = this.saved();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Private browsing and quota limits both throw here. Failing to
        // persist is not worth breaking the page over — the in-memory list
        // still works for this session.
      }
    });
  }

  /**
   * Reads the signal, so calling this from a template makes the caller
   * re-render whenever the saved list changes.
   */
  isSaved(id: string): boolean {
    return this.saved().some((item) => item.id === id);
  }

  toggle(item: CollectionItem): void {
    this.isSaved(item.id) ? this.remove(item.id) : this.add(item);
  }

  add(item: CollectionItem): void {
    if (this.isSaved(item.id)) return;
    // Newest first, and a new array rather than a push: signals compare by
    // reference, so mutating in place would not notify anyone.
    this.saved.update((items) => [item, ...items]);
  }

  remove(id: string): void {
    this.saved.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    this.saved.set([]);
  }
}

function readFromStorage(): readonly CollectionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCollectionItem) : [];
  } catch {
    // Unreadable or corrupt storage starts the user from empty rather than
    // throwing during service construction, which would break the whole app.
    return [];
  }
}
