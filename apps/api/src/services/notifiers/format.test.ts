import { describe, expect, it } from "vitest";
import type { Offer } from "./types.js";
import { formatTelegramCaption, formatWhatsAppCaption } from "./format.js";

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "1",
    externalId: "ext-1",
    store: "MERCADO_LIVRE",
    title: "O Telefone Preto - Joe Hill",
    originalPrice: "89.90" as unknown as Offer["originalPrice"],
    promotionalPrice: "62.93" as unknown as Offer["promotionalPrice"],
    discountPercent: "30" as unknown as Offer["discountPercent"],
    imageUrl: null,
    affiliateUrl: "https://exemplo.com/produto",
    coupon: null,
    paymentMethod: null,
    isInternational: false,
    createdAt: new Date(),
    ...overrides,
  } as Offer;
}

describe("formatTelegramCaption", () => {
  it("starts with the title", () => {
    const caption = formatTelegramCaption(makeOffer());

    const lines = caption.split("\n");
    expect(lines[0]).toBe("O Telefone Preto - Joe Hill");
  });
});

describe("price lines", () => {
  it("shows the original price on a 'De:' line and the promo price with discount on a 'Por:' line", () => {
    const caption = formatTelegramCaption(makeOffer());

    expect(caption).toMatch(/De:\s*R\$\s*89,90/);
    expect(caption).toMatch(/Por:\s*R\$\s*62,93\s*\S+ vista\s*\(30% OFF\)/);
  });

  it("uses the configured payment method instead of the default", () => {
    const caption = formatTelegramCaption(makeOffer({ paymentMethod: "no PIX" }));

    expect(caption).toMatch(/Por:\s*R\$\s*62,93\s*no PIX\s*\(30% OFF\)/);
  });
});

describe("formatWhatsAppCaption", () => {
  it("includes the affiliate link", () => {
    const caption = formatWhatsAppCaption(makeOffer());

    expect(caption).toContain("https://exemplo.com/produto");
  });
});
