// Unit tests for data/currencies.js — the canonical currency list backing
// GET /api/jobs/meta/currencies and employerController.js's
// deriveSalaryString symbol lookup.
const { CURRENCIES, SYMBOL_BY_CODE, CURRENCY_BY_COUNTRY } = require("../data/currencies");

describe("data/currencies", () => {
  it("includes every currency explicitly required by the Post a Job spec", () => {
    const required = ["NPR", "INR", "USD", "EUR", "GBP", "AUD", "CAD", "AED", "JPY", "SGD"];
    const codes = CURRENCIES.map((c) => c.code);
    required.forEach((code) => expect(codes).toContain(code));
  });

  it("has no duplicate currency codes", () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("gives every currency a non-empty code, symbol, and name", () => {
    CURRENCIES.forEach((c) => {
      expect(c.code).toEqual(expect.any(String));
      expect(c.code.length).toBeGreaterThan(0);
      expect(c.symbol.length).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
    });
  });

  it("SYMBOL_BY_CODE has an entry for every currency in the list", () => {
    CURRENCIES.forEach((c) => {
      expect(SYMBOL_BY_CODE[c.code]).toBe(c.symbol);
    });
  });

  it("CURRENCY_BY_COUNTRY only ever points at a code that actually exists in CURRENCIES", () => {
    const validCodes = new Set(CURRENCIES.map((c) => c.code));
    Object.entries(CURRENCY_BY_COUNTRY).forEach(([country, code]) => {
      expect(validCodes.has(code)).toBe(true);
    });
  });

  it("maps the currencies called out by name in the Post a Job spec to their expected country", () => {
    expect(CURRENCY_BY_COUNTRY.Nepal).toBe("NPR");
    expect(CURRENCY_BY_COUNTRY.India).toBe("INR");
    expect(CURRENCY_BY_COUNTRY["United States"]).toBe("USD");
  });
});
