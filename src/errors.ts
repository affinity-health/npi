import type { NppesApiIssue } from "./types.ts";

export class NppesError extends Error {
  override readonly name: string = "NppesError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidNpiError extends NppesError {
  override readonly name = "InvalidNpiError";
}

export class NppesApiError extends NppesError {
  override readonly name = "NppesApiError";

  constructor(readonly issues: readonly NppesApiIssue[]) {
    super(issues.map((issue) => issue.description).join("; ") || "NPPES rejected the request");
  }
}

export class NppesHttpError extends NppesError {
  override readonly name = "NppesHttpError";

  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly body?: string,
  ) {
    super(`NPPES request failed with ${status} ${statusText}`.trim());
  }
}

export class NppesNetworkError extends NppesError {
  override readonly name = "NppesNetworkError";
}

export class NppesResponseError extends NppesError {
  override readonly name = "NppesResponseError";
}

export class NppesTimeoutError extends NppesError {
  override readonly name = "NppesTimeoutError";

  constructor(
    readonly timeoutMs: number,
    options?: ErrorOptions,
  ) {
    super(`NPPES request timed out after ${timeoutMs}ms`, options);
  }
}
