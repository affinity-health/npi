# Affinity NPI

A small, type-safe TypeScript client for the CMS NPPES NPI Registry API.

It looks up individual and organizational NPI records, searches the registry, validates NPI check digits locally, and handles the API's pagination and transient failures without requiring an API key.

## Install

```sh
npm install @affinity-health/npi
```

## Look up an NPI

```ts
import { NppesClient } from "@affinity-health/npi";

const nppes = new NppesClient();
const provider = await nppes.lookup("1003000126");

if (provider?.basic.status === "A") {
  console.log(provider.basic.first_name, provider.basic.last_name);
}
```

`lookup` validates the NPI check digit before making a request and returns `null` when NPPES has no matching record.

## Search the registry

```ts
const result = await nppes.search(
  {
    enumerationType: "NPI-1",
    firstName: "Jane",
    lastName: "Smith",
    state: "MI",
  },
  { limit: 25 },
);

for (const provider of result.results) {
  console.log(provider.number, provider.basic.status);
}
```

Search criteria use camel case. Returned records retain the field names from the NPPES JSON response so it remains straightforward to compare a result with the source API.

The client covers every NPPES 2.1 query parameter: `number`, `enumerationType`, `taxonomyDescription`, `namePurpose`, `firstName`, `useFirstNameAlias`, `lastName`, `organizationName`, `addressPurpose`, `city`, `state`, `postalCode`, and `countryCode`, plus the `limit`, `skip`, and `pretty` request options.

Use `query(criteria, options)` when you need the untouched NPPES top-level envelope. It returns either `{ result_count, results }` or `{ Errors }`. The higher-level `search` method converts successful envelopes to camel case and throws `NppesApiError` for upstream validation issues.

Use `searchAll(criteria)` to follow every page CMS makes available for a search. NPPES returns at most 200 records per request and permits skipping at most 1,000 records, so a single search is limited to 1,200 records.

## Validate locally

```ts
import { isValidNpi, normalizeNpi } from "@affinity-health/npi";

isValidNpi("1003000126"); // true
normalizeNpi("10030-00126"); // "1003000126"
```

Check-digit validation only proves that a number is structurally valid. Use `lookup` to determine whether NPPES contains the NPI.

## Client options

```ts
const nppes = new NppesClient({
  timeoutMs: 10_000,
  retries: 2,
  retryDelayMs: 250,
  fetch: customFetch,
});
```

The client retries network failures and HTTP `429`, `502`, `503`, and `504` responses with bounded exponential backoff. It honors `Retry-After` up to 30 seconds. Pass an `AbortSignal` to `lookup`, `search`, or `searchAll` when you need caller-controlled cancellation.

## Runtime support

The package uses the standard Fetch API and works in modern Node.js, Bun, Cloudflare Workers, and similar server or edge runtimes. The NPPES endpoint does not currently allow cross-origin browser requests, so registry calls generally need to run behind your own server. The local validation helpers can run anywhere.

## What this verifies

NPPES is a public registry maintained by the Centers for Medicare & Medicaid Services. Its API requires no credentials and retrieves updated NPPES data daily.

An active NPI record does **not** establish that a provider is licensed, credentialed, enrolled in Medicare, or permitted to prescribe. Those checks require the appropriate primary source, such as a state licensing board.

CMS does not publish an OpenAPI document for this endpoint. The package contract is checked against the official [NPPES API documentation](https://npiregistry.cms.hhs.gov/api-page), its [JSON conversion field map](https://npiregistry.cms.hhs.gov/help-api/json-conversion), and representative live NPI-1, NPI-2, foreign, military, endpoint, secondary-location, and error responses.

This project is independently maintained by Affinity Health and is not affiliated with or endorsed by CMS.

## Development

```sh
vp install
vp check
vp test
vp pack
```

Run `bun run smoke [npi]` for an opt-in request against the live registry.

## License

MIT
