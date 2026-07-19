import { describe, expect, test } from "vite-plus/test";
import { isValidNpi, normalizeNpi } from "../src/index.ts";

describe("normalizeNpi", () => {
  test("removes spaces and hyphens", () => {
    expect(normalizeNpi(" 10030-00126 ")).toBe("1003000126");
  });
});

describe("isValidNpi", () => {
  test("accepts a valid NPI", () => {
    expect(isValidNpi("1003000126")).toBe(true);
    expect(isValidNpi("10030-00126")).toBe(true);
  });

  test("rejects invalid length, characters, and check digits", () => {
    expect(isValidNpi("100300012")).toBe(false);
    expect(isValidNpi("100300012X")).toBe(false);
    expect(isValidNpi("1003000127")).toBe(false);
  });
});
