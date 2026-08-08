import {
  CollectionItem,
  CollectionItemDetail,
  SearchResults,
} from './collection-item.model';
import {
  LocFacetDto,
  LocItemDto,
  LocMaybeList,
  LocSearchResponseDto,
  LocSearchResultDto,
} from './loc-api.model';

/**
 * Translation layer between the LoC wire format and our domain model.
 *
 * This is the only module allowed to know that the API is inconsistent.
 * Everything it exports returns fully-populated domain objects.
 */

/**
 * Coerce "one value | many values | nothing" into a plain array of non-blank
 * strings.
 *
 * The type guard is not paranoia: the API's own shape is unreliable enough
 * that a non-string can appear in a field declared as strings, and an
 * unguarded `.trim()` throws a TypeError that surfaces as a generic error.
 */
function toArray(value: LocMaybeList<string> | undefined): readonly string[] {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function firstOrNull(values: readonly string[]): string | null {
  return values.length > 0 ? values[0] : null;
}

/**
 * Read a field we want as a single string, whichever way it arrives.
 *
 * Confirmed cases: `summary` is a string on photo records and an array on
 * catalogue records. Assuming a string there threw on every affected item.
 */
function firstString(value: LocMaybeList<string> | undefined): string | null {
  return firstOrNull(toArray(value));
}

/** Facet objects are `{ label: searchUrl }`; we only want the labels. */
function facetLabels(facets: readonly LocFacetDto[] | null | undefined): readonly string[] {
  if (!facets) return [];
  return facets.flatMap((facet) => Object.keys(facet));
}

/** The API mixes protocol-relative and absolute URLs. Normalise to https. */
export function toAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

const ITEM_URL_PATTERN = /\/item\/([^/?#]+)/;

/**
 * Pull the routable item id out of a LoC URL.
 *
 * "http://www.loc.gov/item/2005691065/" -> "2005691065"
 * "http://lccn.loc.gov/2003557451"      -> null (catalogue URL, not an item)
 */
export function extractItemId(id: string | null | undefined): string | null {
  if (!id) return null;
  const match = ITEM_URL_PATTERN.exec(id);
  return match ? match[1] : null;
}

/**
 * Find the item id for a record, checking `aka` when `id` is a catalogue URL.
 *
 * This matters: on a sample of 100 live results, 60 had a non-item `id`, and
 * 57 of those carried the canonical /item/ URL in `aka`. Reading `id` alone
 * would silently discard well over half of all search results.
 *
 * The 3 genuine non-items (research centre pages and similar) still resolve to
 * null and are filtered out, since there is no detail page to link them to.
 */
export function resolveItemId(
  id: string | null | undefined,
  aka: readonly string[] | null | undefined,
): string | null {
  const fromId = extractItemId(id);
  if (fromId) return fromId;

  for (const alternate of aka ?? []) {
    const fromAka = extractItemId(alternate);
    if (fromAka) return fromAka;
  }
  return null;
}

/** Canonical public URL for an item id. */
function itemUrl(id: string): string {
  return `https://www.loc.gov/item/${id}/`;
}

/**
 * Map one search result. Returns null when the record can't be represented —
 * missing item id or missing title — so callers can filter it out.
 */
export function toCollectionItem(dto: LocSearchResultDto): CollectionItem | null {
  const id = resolveItemId(firstString(dto.id), dto.aka);
  const title = firstString(dto.title);

  if (!id || !title) return null;

  return {
    id,
    title,
    // Derived from the resolved id rather than taken from `url`, which often
    // points at the lccn.loc.gov catalogue page even when an /item/ URL exists.
    url: itemUrl(id),
    date: firstString(dto.date),
    // image_url is present but empty for ~60% of results, so the first entry
    // is often missing; toAbsoluteUrl turns that into null.
    thumbnailUrl: toAbsoluteUrl(firstString(dto.image_url)),
    description: firstOrNull(toArray(dto.description)),
    contributors: toArray(dto.contributor),
    subjects: toArray(dto.subject),
    formats: toArray(dto.original_format),
  };
}

export function toSearchResults(
  dto: LocSearchResponseDto,
  requestedPage: number,
): SearchResults {
  const items = (dto.results ?? [])
    .map(toCollectionItem)
    .filter((item): item is CollectionItem => item !== null);

  return {
    items,
    total: dto.pagination?.total ?? items.length,
    page: dto.pagination?.current ?? requestedPage,
    pageSize: dto.pagination?.perpage ?? items.length,
    // The API's own links, rather than a page count derived from `total`:
    // `total` under-reports, and `last` disagrees with both.
    hasNext: Boolean(dto.pagination?.next),
    hasPrevious: Boolean(dto.pagination?.previous),
  };
}

export function toCollectionItemDetail(dto: LocItemDto): CollectionItemDetail | null {
  const id = resolveItemId(firstString(dto.id), dto.aka);
  const title = firstString(dto.title);

  if (!id || !title) return null;

  return {
    id,
    title,
    url: itemUrl(id),
    date: firstString(dto.date) ?? firstString(dto.created_published),
    thumbnailUrl: toAbsoluteUrl(firstString(dto.image_url)),
    description: firstString(dto.description),
    contributors: facetLabels(dto.contributors),
    subjects: facetLabels(dto.subjects),
    formats: facetLabels(dto.format),
    summary: firstString(dto.summary),
    medium: toArray(dto.medium),
    notes: toArray(dto.notes),
    onlineUrl: toAbsoluteUrl(firstString(dto.link)),
  };
}
