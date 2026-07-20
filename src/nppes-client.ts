import {
  InvalidNpiError,
  NppesApiError,
  NppesHttpError,
  NppesNetworkError,
  NppesResponseError,
  NppesTimeoutError,
} from "./errors.ts";
import { isValidNpi, normalizeNpi } from "./npi.ts";
import type {
  NpiRecord,
  NppesApiIssue,
  NppesClientOptions,
  NppesRawResponse,
  NppesRawSearchResult,
  NppesRequestOptions,
  NppesSearchAllOptions,
  NppesSearchCriteria,
  NppesSearchOptions,
  NppesSearchResult,
} from "./types.ts";

const DEFAULT_BASE_URL = "https://npiregistry.cms.hhs.gov/api/";
const API_VERSION = "2.1";
const MAX_LIMIT = 200;
const MAX_SKIP = 1_000;
const MAX_RETRY_AFTER_MS = 30_000;
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

export class NppesClient {
  readonly baseUrl: URL;
  readonly retries: number;
  readonly retryDelayMs: number;
  readonly timeoutMs: number;

  readonly #fetch: typeof globalThis.fetch;

  constructor(options: NppesClientOptions = {}) {
    this.baseUrl = new URL(options.baseUrl ?? DEFAULT_BASE_URL);
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.retries = assertNonNegativeInteger(options.retries ?? 2, "retries");
    this.retryDelayMs = assertNonNegativeInteger(options.retryDelayMs ?? 250, "retryDelayMs");
    this.timeoutMs = assertPositiveInteger(options.timeoutMs ?? 10_000, "timeoutMs");

    if (typeof this.#fetch !== "function") {
      throw new TypeError("A Fetch API implementation is required");
    }
  }

  async lookup(npiValue: string, options: NppesRequestOptions = {}): Promise<NpiRecord | null> {
    const npi = normalizeNpi(npiValue);
    if (!isValidNpi(npi)) throw new InvalidNpiError(`Invalid NPI: ${npiValue}`);

    const response = unwrapResponse(
      await this.#request(
        new URLSearchParams({ number: npi, version: API_VERSION }),
        options.signal,
      ),
    );
    return response.results.find((record) => record.number === npi) ?? null;
  }

  async search(
    criteria: NppesSearchCriteria,
    options: NppesSearchOptions = {},
  ): Promise<NppesSearchResult> {
    const response = unwrapResponse(await this.query(criteria, options));
    return { resultCount: response.result_count, results: response.results };
  }

  /** Return the validated upstream envelope without renaming fields or converting API issues to errors. */
  async query(
    criteria: NppesSearchCriteria,
    options: NppesSearchOptions = {},
  ): Promise<NppesRawResponse> {
    const limit = assertIntegerInRange(options.limit ?? 10, "limit", 1, MAX_LIMIT);
    const skip = assertIntegerInRange(options.skip ?? 0, "skip", 0, MAX_SKIP);
    const params = searchParams(criteria);
    params.set("version", API_VERSION);
    params.set("limit", String(limit));
    params.set("skip", String(skip));
    if (options.pretty) params.set("pretty", "on");
    return this.#request(params, options.signal);
  }

  async searchAll(
    criteria: NppesSearchCriteria,
    options: NppesSearchAllOptions = {},
  ): Promise<NpiRecord[]> {
    const pageSize = assertIntegerInRange(options.pageSize ?? MAX_LIMIT, "pageSize", 1, MAX_LIMIT);
    const results: NpiRecord[] = [];

    for (let skip = 0; skip <= MAX_SKIP; skip += pageSize) {
      const page = await this.search(criteria, { limit: pageSize, signal: options.signal, skip });
      results.push(...page.results);
      if (page.results.length < pageSize) break;
    }

    return results;
  }

  async #request(params: URLSearchParams, signal?: AbortSignal): Promise<NppesRawResponse> {
    const url = new URL(this.baseUrl);
    url.search = params.toString();

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      let timedOut = false;
      const abortFromCaller = () => controller.abort(signal?.reason);
      if (signal?.aborted) abortFromCaller();
      else signal?.addEventListener("abort", abortFromCaller, { once: true });

      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeoutMs);

      try {
        const response = await this.#fetch(url, {
          headers: { accept: "application/json" },
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (attempt < this.retries && RETRYABLE_STATUS_CODES.has(response.status)) {
            await wait(retryDelay(response, attempt, this.retryDelayMs), signal);
            continue;
          }

          const body = await response.text().catch(() => undefined);
          throw new NppesHttpError(response.status, response.statusText, body);
        }

        let body: unknown;
        try {
          body = await response.json();
        } catch (error) {
          throw new NppesResponseError("NPPES returned invalid JSON", { cause: error });
        }
        return parseResponse(body);
      } catch (error) {
        if (
          error instanceof NppesApiError ||
          error instanceof NppesHttpError ||
          error instanceof NppesResponseError
        ) {
          throw error;
        }
        if (signal?.aborted) throw signal.reason ?? error;

        if (attempt < this.retries) {
          await wait(exponentialDelay(attempt, this.retryDelayMs), signal);
          continue;
        }

        if (timedOut) throw new NppesTimeoutError(this.timeoutMs, { cause: error });
        throw new NppesNetworkError("NPPES request failed", { cause: error });
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abortFromCaller);
      }
    }

    throw new NppesNetworkError("NPPES request failed");
  }
}

function searchParams(criteria: NppesSearchCriteria): URLSearchParams {
  const params = new URLSearchParams();
  append(params, "number", criteria.number);
  append(params, "enumeration_type", criteria.enumerationType);
  append(params, "taxonomy_description", criteria.taxonomyDescription);
  append(params, "name_purpose", criteria.namePurpose);
  append(params, "first_name", criteria.firstName);
  append(
    params,
    "use_first_name_alias",
    criteria.useFirstNameAlias === undefined
      ? undefined
      : criteria.useFirstNameAlias
        ? "True"
        : "False",
  );
  append(params, "last_name", criteria.lastName);
  append(params, "organization_name", criteria.organizationName);
  append(params, "address_purpose", criteria.addressPurpose);
  append(params, "city", criteria.city);
  append(params, "state", criteria.state?.toUpperCase());
  append(params, "postal_code", criteria.postalCode);
  append(params, "country_code", criteria.countryCode?.toUpperCase());

  if (params.size === 0) throw new TypeError("At least one NPPES search criterion is required");
  return params;
}

function append(params: URLSearchParams, key: string, value: string | undefined): void {
  const normalized = value?.trim();
  if (normalized) params.set(key, normalized);
}

function parseResponse(value: unknown): NppesRawResponse {
  if (!isObject(value)) throw new NppesResponseError("NPPES returned an unexpected response");

  if ("Errors" in value && Array.isArray(value.Errors)) {
    return { Errors: value.Errors as NppesApiIssue[] };
  }
  if (!Number.isInteger(value.result_count) || !Array.isArray(value.results)) {
    throw new NppesResponseError("NPPES response is missing result_count or results");
  }

  return {
    result_count: value.result_count as number,
    results: value.results as NpiRecord[],
  };
}

function unwrapResponse(response: NppesRawResponse): NppesRawSearchResult {
  if ("Errors" in response) throw new NppesApiError(response.Errors);
  return response;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertPositiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0)
    throw new RangeError(`${name} must be a positive integer`);
  return value;
}

function assertNonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
  return value;
}

function assertIntegerInRange(
  value: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function retryDelay(response: Response, attempt: number, baseDelayMs: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return exponentialDelay(attempt, baseDelayMs);

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1_000, 0), MAX_RETRY_AFTER_MS);

  const date = Date.parse(retryAfter);
  if (Number.isNaN(date)) return exponentialDelay(attempt, baseDelayMs);
  return Math.min(Math.max(date - Date.now(), 0), MAX_RETRY_AFTER_MS);
}

function exponentialDelay(attempt: number, baseDelayMs: number): number {
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.round(baseDelayMs * 2 ** attempt * jitter);
}

async function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (milliseconds <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(signal?.reason ?? new DOMException("The operation was aborted", "AbortError"));
    };

    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}
