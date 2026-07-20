import { describe, expect, test, vi } from "vite-plus/test";
import {
  InvalidNpiError,
  NppesApiError,
  NppesClient,
  NppesHttpError,
  NppesResponseError,
} from "../src/index.ts";
import type { NpiRecord } from "../src/index.ts";

const individual: NpiRecord = {
  addresses: [],
  basic: {
    first_name: "JANE",
    last_name: "SMITH",
    status: "A",
  },
  endpoints: [],
  enumeration_type: "NPI-1",
  identifiers: [],
  number: "1003000126",
  other_names: [],
  practiceLocations: [],
  taxonomies: [],
};

describe("NppesClient.lookup", () => {
  test("normalizes an NPI and returns its exact record", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ result_count: 1, results: [individual] }));
    const client = new NppesClient({ fetch: fetchMock });

    await expect(client.lookup("10030-00126")).resolves.toEqual(individual);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(requestUrl(fetchMock.mock.calls[0]?.[0]).searchParams.get("number")).toBe("1003000126");
    expect(requestUrl(fetchMock.mock.calls[0]?.[0]).searchParams.get("version")).toBe("2.1");
  });

  test("returns null when the registry has no result", async () => {
    const client = new NppesClient({
      fetch: vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({ result_count: 0, results: [] })),
    });

    await expect(client.lookup("1003000126")).resolves.toBeNull();
  });

  test("rejects invalid NPIs without making a request", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new NppesClient({ fetch: fetchMock });

    await expect(client.lookup("1003000127")).rejects.toBeInstanceOf(InvalidNpiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("NppesClient.search", () => {
  test("maps camel-cased criteria to NPPES query parameters", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ result_count: 1, results: [individual] }));
    const client = new NppesClient({ fetch: fetchMock });

    const result = await client.search(
      {
        enumerationType: "NPI-1",
        firstName: "Jane",
        lastName: "Smith",
        number: "1003000126",
        state: "mi",
        useFirstNameAlias: false,
      },
      { limit: 25, pretty: true, skip: 50 },
    );

    expect(result).toEqual({ resultCount: 1, results: [individual] });
    const url = requestUrl(fetchMock.mock.calls[0]?.[0]);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      enumeration_type: "NPI-1",
      first_name: "Jane",
      last_name: "Smith",
      limit: "25",
      number: "1003000126",
      pretty: "on",
      skip: "50",
      state: "MI",
      use_first_name_alias: "False",
      version: "2.1",
    });
  });

  test("rejects empty searches and invalid pagination", async () => {
    const client = new NppesClient({ fetch: vi.fn<typeof fetch>() });

    await expect(client.search({})).rejects.toThrow("At least one NPPES search criterion");
    await expect(client.search({ city: "Detroit" }, { limit: 201 })).rejects.toThrow(
      "limit must be an integer between 1 and 200",
    );
  });

  test("surfaces NPPES validation issues", async () => {
    const client = new NppesClient({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({
          Errors: [
            {
              description: "Field state requires additional search criteria",
              field: "state",
              number: "07",
            },
          ],
        }),
      ),
    });

    const error = await client.search({ state: "MI" }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NppesApiError);
    expect((error as NppesApiError).issues[0]?.field).toBe("state");
  });

  test("can return the untouched NPPES error envelope", async () => {
    const upstream = {
      Errors: [
        {
          description: "Field state requires additional search criteria",
          field: "state",
          number: "07",
        },
      ],
    };
    const client = new NppesClient({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(upstream)),
    });

    await expect(client.query({ state: "MI" })).resolves.toEqual(upstream);
  });

  test("retries transient responses", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ result_count: 1, results: [individual] }));
    const client = new NppesClient({ fetch: fetchMock, retries: 1, retryDelayMs: 0 });

    await expect(client.search({ city: "Detroit" })).resolves.toMatchObject({ resultCount: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("does not retry ordinary HTTP failures", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("bad request", { status: 400, statusText: "Bad Request" }));
    const client = new NppesClient({ fetch: fetchMock, retries: 2 });

    const error = await client.search({ city: "Detroit" }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NppesHttpError);
    expect((error as NppesHttpError).status).toBe(400);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test("rejects malformed successful responses", async () => {
    const client = new NppesClient({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ hello: "world" })),
    });

    await expect(client.search({ city: "Detroit" })).rejects.toBeInstanceOf(NppesResponseError);
  });
});

describe("NppesClient.searchAll", () => {
  test("collects pages until a short page", async () => {
    const second = { ...individual, number: "1245319599" };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ result_count: 1, results: [individual] }))
      .mockResolvedValueOnce(jsonResponse({ result_count: 1, results: [second] }))
      .mockResolvedValueOnce(jsonResponse({ result_count: 0, results: [] }));
    const client = new NppesClient({ fetch: fetchMock });

    await expect(client.searchAll({ city: "Detroit" }, { pageSize: 1 })).resolves.toEqual([
      individual,
      second,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function requestUrl(input: Parameters<typeof fetch>[0] | undefined): URL {
  if (!input) throw new TypeError("Expected fetch to receive a URL");
  if (input instanceof Request) return new URL(input.url);
  return new URL(input);
}
