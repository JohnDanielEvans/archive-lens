import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { CollectionItemDetail, SearchResults } from '../models/collection-item.model';
import { LocItemResponseDto, LocSearchResponseDto } from '../models/loc-api.model';
import { toCollectionItemDetail, toSearchResults } from '../models/loc-mappers';

const LOC_BASE_URL = 'https://www.loc.gov';
const DEFAULT_PAGE_SIZE = 25;

/** Error type the UI can render directly — `message` is always user-safe. */
export class LocApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'LocApiError';
  }
}

/**
 * Data access for the Library of Congress API.
 *
 * The service's only jobs are building requests, delegating to the mappers,
 * and turning transport failures into a single error type. It holds no state —
 * that belongs to the components and services above it.
 */
@Injectable({ providedIn: 'root' })
export class LocApiService {
  private readonly http = inject(HttpClient);

  /**
   * `at` limits the response to the keys we use. Without it the API returns
   * several hundred kB of facets and navigation per request.
   */
  search(
    query: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Observable<SearchResults> {
    const params = new HttpParams()
      .set('q', query)
      .set('fo', 'json')
      .set('at', 'results,pagination')
      .set('c', pageSize)
      .set('sp', page);

    return this.http
      .get<LocSearchResponseDto>(`${LOC_BASE_URL}/search/`, { params })
      .pipe(
        map((response) => toSearchResults(response, page)),
        catchError((error: unknown) => this.toApiError(error)),
      );
  }

  getItem(id: string): Observable<CollectionItemDetail> {
    const params = new HttpParams().set('fo', 'json').set('at', 'item');

    return this.http
      .get<LocItemResponseDto>(
        `${LOC_BASE_URL}/item/${encodeURIComponent(id)}/`,
        { params },
      )
      .pipe(
        map((response) => {
          const detail = response.item ? toCollectionItemDetail(response.item) : null;
          if (!detail) {
            // A 200 response we can't map is, to the user, a missing item.
            throw new LocApiError('That item could not be found.', 404);
          }
          return detail;
        }),
        catchError((error: unknown) => this.toApiError(error)),
      );
  }

  /** Collapse every failure mode into one typed, presentable error. */
  private toApiError(error: unknown): Observable<never> {
    if (error instanceof LocApiError) {
      return throwError(() => error);
    }

    if (error instanceof HttpErrorResponse) {
      // status 0 means the request never completed: offline, DNS, or CORS.
      const message =
        error.status === 0
          ? 'Could not reach the Library of Congress. Check your connection and try again.'
          : error.status === 404
            ? 'That item could not be found.'
            : 'The Library of Congress is not responding right now. Please try again shortly.';

      return throwError(() => new LocApiError(message, error.status));
    }

    return throwError(() => new LocApiError('Something went wrong. Please try again.', 0));
  }
}
