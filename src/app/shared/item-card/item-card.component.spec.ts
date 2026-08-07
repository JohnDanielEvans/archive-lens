import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CollectionItem } from '../../core/models/collection-item.model';
import { ItemCardComponent } from './item-card.component';

describe('ItemCardComponent', () => {
  let fixture: ComponentFixture<ItemCardComponent>;

  const baseItem: CollectionItem = {
    id: '2005691065',
    title: 'Lighthouse, Biloxi, Mississippi',
    url: 'https://www.loc.gov/item/2005691065/',
    date: '1920-01-01',
    thumbnailUrl: 'https://tile.loc.gov/thumb.jpg',
    description: 'Photograph showing lighthouse and pier.',
    contributors: ['Horydczak, Theodor'],
    subjects: ['mississippi', 'biloxi', 'lighthouses', 'piers'],
    formats: ['photo, print, drawing'],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemCardComponent);
  });

  function render(item: Partial<CollectionItem> = {}): void {
    fixture.componentRef.setInput('item', { ...baseItem, ...item });
    fixture.detectChanges();
  }

  function query<T extends HTMLElement>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector);
  }

  it('links the title to the item detail route', () => {
    render();
    const link = query<HTMLAnchorElement>('.card__title a');

    expect(link?.textContent?.trim()).toBe('Lighthouse, Biloxi, Mississippi');
    expect(link?.getAttribute('href')).toBe('/item/2005691065');
  });

  it('renders the title as a heading inside an article', () => {
    render();

    expect(query('article h3')).not.toBeNull();
  });

  it('gives the thumbnail an empty alt so the title is not announced twice', () => {
    render();
    const image = query<HTMLImageElement>('img.card__thumb');

    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('loading')).toBe('lazy');
  });

  it('shows a placeholder when the item has no thumbnail', () => {
    render({ thumbnailUrl: null });

    expect(query('img.card__thumb')).toBeNull();
    expect(query('.card__thumb--empty')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows at most three subjects', () => {
    render();
    const subjects = fixture.nativeElement.querySelectorAll('.card__subjects li');

    expect(subjects.length).toBe(3);
    expect(fixture.nativeElement.querySelector('.card__subjects').getAttribute('aria-label')).toBe(
      'Subjects',
    );
  });

  it('omits the subject list entirely when there are none', () => {
    render({ subjects: [] });

    expect(query('.card__subjects')).toBeNull();
  });

  it('lists up to two contributors in full', () => {
    render({ contributors: ['Adams, Ansel', 'Lange, Dorothea'] });

    expect(fixture.nativeElement.textContent).toContain('Adams, Ansel, Lange, Dorothea');
  });

  it('summarises three or more contributors', () => {
    render({ contributors: ['One', 'Two', 'Three', 'Four'] });

    expect(fixture.nativeElement.textContent).toContain('One, Two and 2 more');
  });

  it('omits optional fields that are absent', () => {
    render({ date: null, description: null, contributors: [] });

    expect(query('.card__meta')).toBeNull();
    expect(query('.card__description')).toBeNull();
  });
});
