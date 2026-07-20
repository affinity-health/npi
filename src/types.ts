export type NppesEnumerationType = "NPI-1" | "NPI-2";
export type NppesNamePurpose = "AO" | "PROVIDER" | "Provider";
export type NppesAddressPurpose = "LOCATION" | "MAILING" | "PRIMARY" | "SECONDARY";
export type NppesAddressType = "DOM" | "FGN" | "MIL";

export type NppesSearchCriteria = {
  number?: string;
  enumerationType?: NppesEnumerationType;
  taxonomyDescription?: string;
  namePurpose?: NppesNamePurpose;
  firstName?: string;
  useFirstNameAlias?: boolean;
  lastName?: string;
  organizationName?: string;
  addressPurpose?: NppesAddressPurpose;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
};

export type NppesRequestOptions = {
  signal?: AbortSignal;
};

export type NppesSearchOptions = NppesRequestOptions & {
  limit?: number;
  pretty?: boolean;
  skip?: number;
};

export type NppesSearchAllOptions = NppesRequestOptions & {
  pageSize?: number;
};

export type NppesClientOptions = {
  baseUrl?: string | URL;
  fetch?: typeof globalThis.fetch;
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
};

export type NppesApiIssue = {
  description: string;
  field?: string;
  number?: string;
};

export type NpiAddress = {
  address_1?: string;
  address_2?: string;
  address_purpose?: "LOCATION" | "MAILING";
  address_type?: NppesAddressType;
  city?: string;
  country_code?: string;
  country_name?: string;
  fax_number?: string;
  postal_code?: string;
  state?: string;
  telephone_number?: string;
};

export type NpiBasic = {
  authorized_official_credential?: string;
  authorized_official_first_name?: string;
  authorized_official_last_name?: string;
  authorized_official_middle_name?: string;
  authorized_official_name_prefix?: string;
  authorized_official_name_suffix?: string;
  authorized_official_telephone_number?: string;
  authorized_official_title_or_position?: string;
  certification_date?: string;
  credential?: string;
  deactivation_date?: string;
  deactivation_reason_code?: string;
  ein?: string;
  enumeration_date?: string;
  first_name?: string;
  last_name?: string;
  last_updated?: string;
  middle_name?: string;
  name_prefix?: string;
  name_suffix?: string;
  organization_name?: string;
  organizational_subpart?: "YES" | "NO";
  parent_organization_ein?: string;
  parent_organization_legal_business_name?: string;
  reactivation_date?: string;
  replacement_npi?: string;
  sex?: "F" | "M";
  sole_proprietor?: "YES" | "NO";
  status?: "A" | "D";
};

export type NpiTaxonomy = {
  code?: string;
  desc?: string | null;
  license?: string | null;
  primary?: boolean;
  state?: string | null;
  taxonomy_group?: string;
};

export type NpiIdentifier = {
  code?: string;
  desc?: string;
  identifier?: string;
  issuer?: string | null;
  state?: string | null;
};

export type NpiOtherName = {
  code?: string;
  credential?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  organization_name?: string;
  prefix?: string;
  suffix?: string;
  type?: string;
};

export type NpiEndpoint = {
  address_1?: string;
  address_2?: string;
  address_type?: NppesAddressType;
  affiliation?: string;
  affiliationName?: string;
  /** Spelling shown in the CMS conversion table; live responses currently use affiliationName. */
  affliationName?: string;
  city?: string;
  contentOtherDescription?: string;
  contentType?: string;
  contentTypeDescription?: string;
  country_code?: string;
  country_name?: string;
  endpoint?: string;
  endpointDescription?: string;
  endpointType?: string;
  endpointTypeDescription?: string;
  postal_code?: string;
  state?: string;
  use?: string;
  useDescription?: string;
  useOtherDescription?: string;
};

export type NpiPracticeLocation = {
  address_1?: string;
  address_2?: string;
  address_purpose?: "LOCATION";
  address_type?: NppesAddressType;
  city?: string;
  country_code?: string;
  country_name?: string;
  fax_number?: string;
  postal_code?: string;
  state?: string;
  telephone_number?: string;
};

export type NpiRecord = {
  addresses: NpiAddress[];
  basic: NpiBasic;
  created_epoch?: string;
  endpoints: NpiEndpoint[];
  enumeration_type: NppesEnumerationType;
  identifiers: NpiIdentifier[];
  last_updated_epoch?: string;
  number: string;
  other_names: NpiOtherName[];
  practiceLocations: NpiPracticeLocation[];
  taxonomies: NpiTaxonomy[];
};

export type NppesSearchResult = {
  resultCount: number;
  results: NpiRecord[];
};

export type NppesRawSearchResult = {
  result_count: number;
  results: NpiRecord[];
};

export type NppesRawErrorResult = {
  Errors: NppesApiIssue[];
};

export type NppesRawResponse = NppesRawSearchResult | NppesRawErrorResult;
