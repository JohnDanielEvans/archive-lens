/**
 * Wire types for the Library of Congress JSON API (https://www.loc.gov/apis/).
 *
 * These describe what the API *actually sends*, not what we wish it sent, so
 * nearly everything is optional. Observed inconsistencies in live responses:
 *
 *   - `type` comes back as string[] most of the time and as a bare string
 *     occasionally, hence LocMaybeList.
 *   - `image_url` is always present but is an empty array for ~60% of results.
 *   - `contributor`, `date`, `subject` and `location` are frequently absent.
 *   - `id` is a URL, and is not always an /item/ URL.
 *
 * Nothing outside core/models should import these. Components consume the
 * domain types in collection-item.model.ts instead.
 */

/** A field the API may send as one value, several values, or not at all. */
export type LocMaybeList<T> = T | readonly T[] | null;

/**
 * Facet-style values on the item endpoint, shaped `{ "label": "search url" }`.
 * The label is the key, so the useful data is in Object.keys().
 */
export type LocFacetDto = Readonly<Record<string, string>>;

/** One entry in the `results` array of a search response. */
export interface LocSearchResultDto {
  readonly id?: LocMaybeList<string>;
  readonly title?: LocMaybeList<string>;
  readonly url?: LocMaybeList<string>;
  /** Alternate URLs for the same record. Often the only place the canonical
   *  /item/ URL appears when `id` is an lccn.loc.gov catalogue URL. */
  readonly aka?: readonly string[] | null;
  readonly date?: LocMaybeList<string>;
  readonly image_url?: LocMaybeList<string>;
  readonly description?: LocMaybeList<string>;
  readonly contributor?: LocMaybeList<string>;
  readonly subject?: LocMaybeList<string>;
  readonly original_format?: LocMaybeList<string>;
  readonly type?: LocMaybeList<string>;
  readonly partof?: LocMaybeList<string>;
}

export interface LocPaginationDto {
  readonly current?: number;
  readonly perpage?: number;
  /** Matching results. Note the API also sends `of`, which is a larger and
   *  less well-documented figure; `total` is what the UI reports. */
  readonly total?: number;
  readonly of?: number;
  readonly next?: string | null;
  readonly previous?: string | null;
}

export interface LocSearchResponseDto {
  readonly results?: readonly LocSearchResultDto[];
  readonly pagination?: LocPaginationDto;
}

/** The `item` object from `/item/{id}/?fo=json`. Richer, and differently
 *  shaped from a search result — subjects/format arrive as facet objects. */
export interface LocItemDto {
  readonly id?: LocMaybeList<string>;
  readonly aka?: readonly string[] | null;
  readonly title?: LocMaybeList<string>;
  readonly date?: LocMaybeList<string>;
  /** String on photo records, array on catalogue records. Verified, not guessed. */
  readonly summary?: LocMaybeList<string>;
  readonly link?: LocMaybeList<string>;
  readonly image_url?: LocMaybeList<string>;
  readonly created_published?: LocMaybeList<string>;
  readonly description?: LocMaybeList<string>;
  readonly medium?: LocMaybeList<string>;
  readonly notes?: LocMaybeList<string>;
  readonly subjects?: readonly LocFacetDto[] | null;
  readonly format?: readonly LocFacetDto[] | null;
  readonly contributors?: readonly LocFacetDto[] | null;
}

export interface LocItemResponseDto {
  readonly item?: LocItemDto;
}
