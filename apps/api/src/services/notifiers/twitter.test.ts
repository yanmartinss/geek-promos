import { describe, expect, it } from "vitest";

import { matchesBestOfferFilter, type TwitterConfig } from "./twitter.js";
import type { Offer } from "./types.js";

const baseConfig: TwitterConfig = {
  appKey: "key",
  appSecret: "secret",
  accessToken: "token",
  accessSecret: "token-secret",
  telegramGroupUrl: "https://t.me/geekpromos",
  minDiscountPercent: 40,
  highInterestFilter: /box|luxo|colecionador/i,
  dailyLimit: 15,
  minIntervalMinutes: 30,
};

function buildOffer(overrides: Partial<Offer>): Offer {
  return {
    id: "1",
    externalId: "ext-1",
    store: "MERCADO_LIVRE",
    title: "Livro qualquer",
    originalPrice: 100 as unknown as Offer["originalPrice"],
    promotionalPrice: 80 as unknown as Offer["promotionalPrice"],
    discountPercent: 20 as unknown as Offer["discountPercent"],
    imageUrl: null,
    affiliateUrl: "https://example.com/produto",
    coupon: null,
    paymentMethod: null,
    isInternational: false,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("matchesBestOfferFilter", () => {
  it("aprova ofertas com desconto acima do limiar", () => {
    const offer = buildOffer({ discountPercent: 45 as unknown as Offer["discountPercent"] });
    expect(matchesBestOfferFilter(offer, baseConfig)).toBe(true);
  });

  it("aprova itens de alto interesse mesmo com desconto baixo", () => {
    const offer = buildOffer({
      title: "Box de Luxo Senhor dos Anéis",
      discountPercent: 15 as unknown as Offer["discountPercent"],
    });
    expect(matchesBestOfferFilter(offer, baseConfig)).toBe(true);
  });

  it("rejeita ofertas com desconto baixo e sem palavra-chave de alto interesse", () => {
    const offer = buildOffer({
      title: "Livro comum qualquer",
      discountPercent: 15 as unknown as Offer["discountPercent"],
    });
    expect(matchesBestOfferFilter(offer, baseConfig)).toBe(false);
  });
});
