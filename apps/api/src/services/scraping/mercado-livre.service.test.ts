import { describe, expect, it } from "vitest";

import { extractExternalId, looksInternational } from "./mercado-livre.service.js";

describe("extractExternalId", () => {
  it("extracts a Mercado Livre item id from a product URL", () => {
    expect(extractExternalId("https://www.mercadolivre.com.br/produto/p/MLB123456789")).toBe("MLB123456789");
  });

  it("normalizes a hyphenated item id", () => {
    expect(extractExternalId("https://produto.mercadolivre.com.br/MLB-987654321-item")).toBe("MLB987654321");
  });

  it("falls back to a hash of the path and query for unrecognized URLs", () => {
    const id = extractExternalId("https://www.mercadolivre.com.br/some-item?utm=1");
    expect(id).toMatch(/^HASH-/);
  });

  it("returns null for an invalid URL with no item id", () => {
    expect(extractExternalId("not a url")).toBeNull();
  });
});

describe("looksInternational", () => {
  it("detects the 'Internacional' badge in the card's full text", () => {
    expect(looksInternational("China Internacional China Enviado pelo FULL")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(looksInternational("produto internacional")).toBe(true);
  });

  it("returns false when the card text has no mention of it", () => {
    expect(looksInternational("Frete grátis Chegará grátis hoje")).toBe(false);
  });

  it("returns false for empty text", () => {
    expect(looksInternational("")).toBe(false);
  });
});
