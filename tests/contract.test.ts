import { expect, test } from "vite-plus/test";
import type { NpiRecord, NppesRawErrorResult, NppesRawSearchResult } from "../src/index.ts";

const exhaustiveRecord = {
  addresses: [
    {
      address_1: "1 Main St",
      address_2: "Suite 2",
      address_purpose: "LOCATION",
      address_type: "DOM",
      city: "Detroit",
      country_code: "US",
      country_name: "United States",
      fax_number: "313-555-0101",
      postal_code: "48201",
      state: "MI",
      telephone_number: "313-555-0100",
    },
  ],
  basic: {
    authorized_official_credential: "MD",
    authorized_official_first_name: "JANE",
    authorized_official_last_name: "SMITH",
    authorized_official_middle_name: "Q",
    authorized_official_name_prefix: "DR",
    authorized_official_name_suffix: "JR",
    authorized_official_telephone_number: "3135550100",
    authorized_official_title_or_position: "OWNER",
    certification_date: "2026-01-01",
    credential: "MD",
    deactivation_date: "2025-01-01",
    deactivation_reason_code: "01",
    ein: "000000000",
    enumeration_date: "2020-01-01",
    first_name: "JANE",
    last_name: "SMITH",
    last_updated: "2026-01-01",
    middle_name: "Q",
    name_prefix: "DR",
    name_suffix: "JR",
    organization_name: "EXAMPLE HEALTH",
    organizational_subpart: "NO",
    parent_organization_ein: "000000001",
    parent_organization_legal_business_name: "EXAMPLE PARENT",
    reactivation_date: "2026-01-01",
    replacement_npi: "1245319599",
    sex: "F",
    sole_proprietor: "NO",
    status: "A",
  },
  created_epoch: "1577836800000",
  endpoints: [
    {
      address_1: "1 Main St",
      address_2: "Suite 2",
      address_type: "DOM",
      affiliation: "Y",
      affiliationName: "Example Health",
      affliationName: "Example Health",
      city: "Detroit",
      contentOtherDescription: "Other content",
      contentType: "CSV",
      contentTypeDescription: "CSV",
      country_code: "US",
      country_name: "United States",
      endpoint: "https://example.test/fhir",
      endpointDescription: "FHIR endpoint",
      endpointType: "FHIR",
      endpointTypeDescription: "FHIR URL",
      postal_code: "48201",
      state: "MI",
      use: "HIE",
      useDescription: "Health Information Exchange (HIE)",
      useOtherDescription: "Other use",
    },
  ],
  enumeration_type: "NPI-2",
  identifiers: [{ code: "05", desc: "MEDICAID", identifier: "A123", issuer: "MI", state: "MI" }],
  last_updated_epoch: "1767225600000",
  number: "1003000126",
  other_names: [
    {
      code: "3",
      credential: "MD",
      first_name: "JANE",
      last_name: "SMITH",
      middle_name: "Q",
      organization_name: "EXAMPLE CLINIC",
      prefix: "DR",
      suffix: "JR",
      type: "Doing Business As",
    },
  ],
  practiceLocations: [
    {
      address_1: "2 Main St",
      address_2: "Suite 3",
      address_purpose: "LOCATION",
      address_type: "FGN",
      city: "Windsor",
      country_code: "CA",
      country_name: "Canada",
      fax_number: "519-555-0101",
      postal_code: "N9A1A1",
      state: "ON",
      telephone_number: "519-555-0100",
    },
  ],
  taxonomies: [
    {
      code: "207R00000X",
      desc: "Internal Medicine",
      license: "A123",
      primary: true,
      state: "MI",
      taxonomy_group: "",
    },
  ],
} satisfies NpiRecord;

test("covers every field in the CMS conversion map and observed API response", () => {
  const success = {
    result_count: 1,
    results: [exhaustiveRecord],
  } satisfies NppesRawSearchResult;
  const failure = {
    Errors: [{ description: "Invalid value", field: "state", number: "07" }],
  } satisfies NppesRawErrorResult;

  expect(success.results[0]?.endpoints[0]?.useOtherDescription).toBe("Other use");
  expect(failure.Errors[0]?.number).toBe("07");
});
