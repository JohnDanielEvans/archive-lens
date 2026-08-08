import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CollectionItem } from '../../core/models/collection-item.model';
import { SavedItemsService } from '../../core/services/saved-items.service';
import { SavedPageComponent } from './saved-page.component';

const STORAGE_KEY = 'archive-lens.saved-items.v1';

function makeItem(id: string, title: string): CollectionItem {
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

describe('SavedPageComponent', () => {
  let fixture: ComponentFixture<SavedPageComponent>;
  let saved: SavedItemsService;

  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);

    await TestBed.configureTestingModule({
      imports: [SavedPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    saved = TestBed.inject(SavedItemsService);
    fixture = TestBed.createComponent(SavedPageComponent);
  });

  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  function text(): string {
    return fixture.nativeElement.textContent;
  }

  it('explains how to save when the list is empty', () => {
    fixture.detectChanges();

    expect(text()).toContain("haven't saved anything yet");
    expect(fixture.nativeElement.querySelector('.empty a').getAttribute('href')).toBe('/search');
    expect(fixture.nativeElement.querySelector('.results')).toBeNull();
  });

  it('renders a card per saved item', () => {
    saved.add(makeItem('1', 'Lighthouse'));
    saved.add(makeItem('2', 'Harbour'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-item-card').length).toBe(2);
    expect(text()).toContain('Lighthouse');
    expect(text()).toContain('Harbour');
  });

  it('uses singular wording for one item', () => {
    saved.add(makeItem('1', 'Lighthouse'));
    fixture.detectChanges();

    expect(text()).toContain('1 saved item');
    expect(text()).not.toContain('1 saved items');
  });

  it('updates live when an item is unsaved from its card', () => {
    saved.add(makeItem('1', 'Lighthouse'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.card__save').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-item-card').length).toBe(0);
    expect(text()).toContain("haven't saved anything yet");
  });
});
