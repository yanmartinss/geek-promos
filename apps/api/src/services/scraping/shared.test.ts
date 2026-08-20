import { describe, expect, it } from "vitest";

import { computeDiscountPercent, dedupeByExternalId, parseDiscount, parsePrice, type ScrapedOffer } from "./shared.js";

describe("parsePrice", () => {
  it("parses a plain integer price", () => {
    expect(parsePrice("299")).toBe(299);
  });

  it("parses a price with thousands separator and decimal comma", () => {
    expect(parsePrice("1.299,90")).toBe(1299.9);
  });

  it("parses a price with currency symbol and whitespace", () => {
    expect(parsePrice("R$ 89,00")).toBe(89);
  });

  it("returns 0 for unparseable text", () => {
    expect(parsePrice("indisponível")).toBe(0);
  });
});

describe("parseDiscount", () => {
  it("extracts the leading integer from a discount label", () => {
    expect(parseDiscount("20% OFF")).toBe(20);
  });

  it("returns 0 when there is no digit", () => {
    expect(parseDiscount("OFF")).toBe(0);
  });
});

describe("computeDiscountPercent", () => {
  it("computes the rounded percentage drop", () => {
    expect(computeDiscountPercent(100, 75)).toBe(25);
  });

  it("rounds to the nearest integer", () => {
    expect(computeDiscountPercent(99.9, 74.9)).toBe(25);
  });

  it("returns 0 when the original price is zero or negative", () => {
    expect(computeDiscountPercent(0, 50)).toBe(0);
    expect(computeDiscountPercent(-10, 50)).toBe(0);
  });
});

describe("dedupeByExternalId", () => {
  it("keeps only the first offer per externalId", () => {
    const offer = (externalId: string, title: string): ScrapedOffer => ({
      externalId,
      store: "MERCADO_LIVRE",
      title,
      originalPrice: 100,
      promotionalPrice: 80,
      discountPercent: 20,
      imageUrl: null,
      affiliateUrl: "https://example.com",
    });

    const deduped = dedupeByExternalId([offer("A1", "first"), offer("A1", "second"), offer("A2", "third")]);

    expect(deduped).toHaveLength(2);
    expect(deduped.map((o) => o.title)).toEqual(["first", "third"]);
  });
});
