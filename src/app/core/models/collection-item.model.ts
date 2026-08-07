/**
 * Domain types — the shape the rest of the application works with.
 *
 * Every field is required. Optionality is expressed as `| null` for single
 * values and as an empty array for lists, so templates never need `?.` chains
 * or Array.isArray checks. Anything the API might omit has already been
 * resolved by the mappers before a component sees it.
 */

export interface CollectionItem {
  /** Short LoC identifier (e.g. "2005691065") used as our :id route param. */
  readonly id: string;
  readonly title: string;
  /** Absolute URL to the record on loc.gov. */
  readonly url: string;
  readonly date: string | null;
  readonly thumbnailUrl: string | null;
  readonly description: string | null;
  readonly contributors: readonly string[];
  readonly subjects: readonly string[];
  readonly formats: readonly string[];
}

/** A single item's full record, as shown on the detail page. */
export interface CollectionItemDetail extends CollectionItem {
  readonly summary: string | null;
  readonly medium: readonly string[];
  readonly notes: readonly string[];
  /** Public loc.gov page for the item, when the API supplies one. */
  readonly onlineUrl: string | null;
}

/** One page of search results, plus what the UI needs to describe it. */
export interface SearchResults {
  readonly items: readonly CollectionItem[];
  /**
   * Matches reported by the API. Treat as approximate: LoC under-reports it,
   * and pages beyond total/pageSize still return real records. It is fine for
   * display but must not be used to compute how many pages exist.
   */
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  /**
   * Taken from the API's own next/previous links, which are the only
   * trustworthy signal for whether more pages exist.
   */
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}
