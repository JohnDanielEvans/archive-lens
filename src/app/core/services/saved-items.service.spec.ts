import { TestBed } from '@angular/core/testing';

import { CollectionItem } from '../models/collection-item.model';
import { SavedItemsService } from './saved-items.service';

const STORAGE_KEY = 'archive-lens.saved-items.v1';

function makeItem(id: string, title = `Item ${id}`): CollectionItem {
  return {
    id,
    title,
    url: `https://www.loc.gov/item/${id}/`,
    date: null,
    thumbnailUrl: null,
    description: null,
    contributors: [],
    subjects: [],
    formats: [],
  };
}

describe('SavedItemsService', () => {
  let service: SavedItemsService;

  function stored(): unknown {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  }

  /** Effects are scheduled, not synchronous, so tests have to drain them. */
  function flush(): void {
    TestBed.flushEffects();
  }

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(SavedItemsService);
  });

  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('starts empty', () => {
    expect(service.items()).toEqual([]);
    expect(service.count()).toBe(0);
  });

  it('adds an item and reports it as saved', () => {
    service.add(makeItem('1'));

    expect(service.count()).toBe(1);
    expect(service.isSaved('1')).toBeTrue();
    expect(service.isSaved('2')).toBeFalse();
  });

  it('puts newly saved items first', () => {
    service.add(makeItem('1'));
    service.add(makeItem('2'));

    expect(service.items().map((item) => item.id)).toEqual(['2', '1']);
  });

  it('ignores a duplicate save', () => {
    service.add(makeItem('1'));
    service.add(makeItem('1'));

    expect(service.count()).toBe(1);
  });

  it('removes an item', () => {
    service.add(makeItem('1'));
    service.remove('1');

    expect(service.isSaved('1')).toBeFalse();
    expect(service.count()).toBe(0);
  });

  it('toggles both ways', () => {
    const item = makeItem('1');

    service.toggle(item);
    expect(service.isSaved('1')).toBeTrue();

    service.toggle(item);
    expect(service.isSaved('1')).toBeFalse();
  });

  it('clears everything', () => {
    service.add(makeItem('1'));
    service.add(makeItem('2'));
    service.clear();

    expect(service.items()).toEqual([]);
  });

  describe('persistence', () => {
    it('writes to localStorage when the list changes', () => {
      service.add(makeItem('1', 'Lighthouse'));
      flush();

      const raw = stored() as CollectionItem[];
      expect(raw.length).toBe(1);
      expect(raw[0].title).toBe('Lighthouse');
    });

    it('restores previously saved items on construction', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeItem('42')]));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const restored = TestBed.inject(SavedItemsService);

      expect(restored.isSaved('42')).toBeTrue();
    });

    it('starts empty when storage holds invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not json at all');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});

      expect(TestBed.inject(SavedItemsService).items()).toEqual([]);
    });

    it('drops stored entries that are not collection items', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([makeItem('1'), { nope: true }, null, 'string']),
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const restored = TestBed.inject(SavedItemsService);

      expect(restored.count()).toBe(1);
      expect(restored.isSaved('1')).toBeTrue();
    });

    it('starts empty when storage holds a non-array', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: '1' }));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});

      expect(TestBed.inject(SavedItemsService).items()).toEqual([]);
    });
  });
});
