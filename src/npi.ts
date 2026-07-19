const NPI_PREFIX = "80840";

/** Remove spaces and hyphens commonly introduced while entering an NPI. */
export function normalizeNpi(value: string): string {
  return value.trim().replace(/[\s-]+/gu, "");
}

/** Validate an NPI using the CMS check-digit algorithm. */
export function isValidNpi(value: string): boolean {
  const npi = normalizeNpi(value);
  if (!/^\d{10}$/u.test(npi)) return false;

  const payload = `${NPI_PREFIX}${npi.slice(0, 9)}`;
  let total = 0;

  for (let index = payload.length - 1, shouldDouble = true; index >= 0; index -= 1) {
    let digit = Number(payload[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    total += digit;
    shouldDouble = !shouldDouble;
  }

  return Number(npi[9]) === (10 - (total % 10)) % 10;
}
