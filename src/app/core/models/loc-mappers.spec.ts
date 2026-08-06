import { LocItemDto, LocSearchResponseDto, LocSearchResultDto } from './loc-api.model';
import {
  extractItemId,
  resolveItemId,
  toAbsoluteUrl,
  toCollectionItem,
  toCollectionItemDetail,
  toSearchResults,
} from './loc-mappers';

/**
 * Fixtures below are trimmed from real loc.gov responses, including the
 * inconsistencies: empty image arrays, absent contributors, and `type`
 * arriving as a bare string.
 */

const photoResult: LocSearchResultDto = {
  id: 'http://www.loc.gov/item/2005691065/',
  title: 'Lighthouse, Biloxi, Mississippi',
  url: 'https://www.loc.gov/item/2005691065/',
  date: '1920-01-01',
  image_url: ['https://tile.loc.gov/storage-services/service/pnp/09074_150px.jpg'],
  description: ['1 photographic print. | Photograph showing lighthouse and pier.'],
  subject: ['mississippi', 'biloxi', 'lighthouses'],
  original_format: ['photo, print, drawing'],
  contributor: null,
  type: null,
};

describe('extractItemId', () => {
  it('pulls the id out of an item URL', () => {
    expect(extractItemId('http://www.loc.gov/item/2005691065/')).toBe('2005691065');
  });

  it('returns null for catalogue records that are not items', () => {
    expect(extractItemId('http://lccn.loc.gov/2003557451')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(extractItemId(undefined)).toBeNull();
  });
});

describe('resolveItemId', () => {
  it('prefers the id field when it is an item URL', () => {
    expect(resolveItemId('http://www.loc.gov/item/123/', ['http://www.loc.gov/item/999/'])).toBe(
      '123',
    );
  });

  it('falls back to aka when id is a catalogue URL', () => {
    const id = resolveItemId('http://lccn.loc.gov/2003629611', [
      'http://www.loc.gov/item/2003629611/',
      'http://ask.usgs.gov/maps.html',
    ]);
    expect(id).toBe('2003629611');
  });

  it('returns null when neither id nor aka contains an item URL', () => {
    expect(
      resolveItemId('http://www.loc.gov/research-centers/geography-and-map/', []),
    ).toBeNull();
  });

  it('tolerates a missing aka field', () => {
    expect(resolveItemId('http://lccn.loc.gov/123', undefined)).toBeNull();
  });
});

describe('toAbsoluteUrl', () => {
  it('upgrades protocol-relative URLs to https', () => {
    expect(toAbsoluteUrl('//lccn.loc.gov/2003557451')).toBe('https://lccn.loc.gov/2003557451');
  });

  it('leaves absolute URLs alone', () => {
    expect(toAbsoluteUrl('https://www.loc.gov/item/1/')).toBe('https://www.loc.gov/item/1/');
  });

  it('returns null for undefined', () => {
    expect(toAbsoluteUrl(undefined)).toBeNull();
  });
});

describe('toCollectionItem', () => {
  it('maps a complete result', () => {
    const item = toCollectionItem(photoResult);

    expect(item).not.toBeNull();
    expect(item!.id).toBe('2005691065');
    expect(item!.title).toBe('Lighthouse, Biloxi, Mississippi');
    expect(item!.subjects).toEqual(['mississippi', 'biloxi', 'lighthouses']);
    expect(item!.description).toContain('photographic print');
  });

  it('turns a null contributor into an empty array, not null', () => {
    expect(toCollectionItem(photoResult)!.contributors).toEqual([]);
  });

  it('turns an empty image_url array into a null thumbnail', () => {
    const item = toCollectionItem({ ...photoResult, image_url: [] });
    expect(item!.thumbnailUrl).toBeNull();
  });

  it('accepts a single string where the API usually sends an array', () => {
    const item = toCollectionItem({ ...photoResult, subject: 'lighthouses' });
    expect(item!.subjects).toEqual(['lighthouses']);
  });

  it('drops blank strings from list fields', () => {
    const item = toCollectionItem({ ...photoResult, subject: ['maps', '  ', ''] });
    expect(item!.subjects).toEqual(['maps']);
  });

  it('recovers the id from aka when id is a catalogue URL', () => {
    const item = toCollectionItem({
      ...photoResult,
      id: 'http://lccn.loc.gov/2003629611',
      aka: ['http://www.loc.gov/item/2003629611/', 'http://lccn.loc.gov/2003629611'],
    });
    expect(item!.id).toBe('2003629611');
  });

  it('returns null when the record has no routable item id anywhere', () => {
    expect(toCollectionItem({ ...photoResult, id: 'http://lccn.loc.gov/2003557451' })).toBeNull();
  });

  it('returns null when the record has no title', () => {
    expect(toCollectionItem({ ...photoResult, title: '   ' })).toBeNull();
  });
});

describe('toSearchResults', () => {
  const response: LocSearchResponseDto = {
    results: [photoResult, { ...photoResult, id: 'http://lccn.loc.gov/2003557451' }],
    pagination: { current: 2, perpage: 25, total: 75912 },
  };

  it('filters out records that cannot be mapped', () => {
    const results = toSearchResults(response, 2);
    expect(results.items.length).toBe(1);
  });

  it('reports the API total rather than the mapped count', () => {
    expect(toSearchResults(response, 2).total).toBe(75912);
  });

  it('falls back to the requested page when pagination is missing', () => {
    expect(toSearchResults({ results: [] }, 3).page).toBe(3);
  });

  it('handles a response with no results key at all', () => {
    const results = toSearchResults({}, 1);
    expect(results.items).toEqual([]);
    expect(results.total).toBe(0);
  });
});

describe('toCollectionItemDetail', () => {
  const itemDto: LocItemDto = {
    id: 'http://www.loc.gov/item/2005691065/',
    title: 'Lighthouse, Biloxi, Mississippi',
    date: '1920-01-01',
    summary: 'Photograph showing lighthouse and pier.',
    link: 'https://www.loc.gov/pictures/item/2005691065/',
    medium: ['1 photographic print.'],
    notes: ['Wittemann Collection.', 'Title from item.'],
    subjects: [{ biloxi: 'https://www.loc.gov/search/?fa=subject:biloxi' }, { lighthouses: '' }],
    format: [{ 'photo, print, drawing': 'https://www.loc.gov/search/' }],
  };

  it('reads labels out of facet objects', () => {
    const detail = toCollectionItemDetail(itemDto);
    expect(detail!.subjects).toEqual(['biloxi', 'lighthouses']);
    expect(detail!.formats).toEqual(['photo, print, drawing']);
  });

  it('falls back to created_published when date is absent', () => {
    const detail = toCollectionItemDetail({
      ...itemDto,
      date: undefined,
      created_published: ['[ca. 1920]'],
    });
    expect(detail!.date).toBe('[ca. 1920]');
  });

  it('returns null when the item has no id', () => {
    expect(toCollectionItemDetail({ ...itemDto, id: undefined })).toBeNull();
  });
});
