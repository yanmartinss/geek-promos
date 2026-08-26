import { describe, expect, it, vi } from "vitest";

vi.mock("../../config.js", () => ({
  config: {
    amazon: { associateTag: "test-tag-20" },
    scraper: {
      keywords: [],
      titleKeywordFilter: /livro|hq|funko|action figure|pokemon|magic|jogo de tabuleiro/i,
      maxItemsPerKeyword: 20,
      pageTimeoutMs: 30000,
      navDelayMs: 2000,
      concurrency: 1,
      proxyUrl: null,
    },
    offer: { minDiscountPercent: 20 },
  },
}));

const { extractExternalId, wrapAffiliateLink, looksInternational } = await import("./amazon.service.js");

describe("extractExternalId", () => {
  it("extracts the ASIN from a /dp/ product URL", () => {
    expect(extractExternalId("https://www.amazon.com.br/Produto-Exemplo/dp/B0C1D2E3F4")).toBe("B0C1D2E3F4");
  });

  it("extracts the ASIN from a /gp/product/ URL", () => {
    expect(extractExternalId("https://www.amazon.com.br/gp/product/B0C1D2E3F4")).toBe("B0C1D2E3F4");
  });

  it("extracts the ASIN when the URL has trailing query params after it", () => {
    expect(extractExternalId("https://www.amazon.com.br/Produto/dp/B0C1D2E3F4/ref=sr_1_1?keywords=funko")).toBe(
      "B0C1D2E3F4",
    );
  });

  it("extracts the ASIN from a /sspa/click sponsored link with the real URL url-encoded", () => {
    const sponsoredUrl =
      "https://www.amazon.com.br/sspa/click?ie=UTF8&spc=abc123&url=%2FDevagar-Sempre-Tarsila-Segue-Frente%2Fdp%2F6589040001%2Fref%3Dsr_1_1_sspa%3Fkeywords%3Dlivro";
    expect(extractExternalId(sponsoredUrl)).toBe("6589040001");
  });

  it("falls back to a hash of the path and query for unrecognized URLs", () => {
    const id = extractExternalId("https://www.amazon.com.br/s?k=funko");
    expect(id).toMatch(/^HASH-/);
  });

  it("returns null for a completely invalid URL", () => {
    expect(extractExternalId("not a url")).toBeNull();
  });
});

describe("wrapAffiliateLink", () => {
  it("builds a clean /dp/{ASIN}?tag= link from the ASIN", () => {
    const wrapped = wrapAffiliateLink("B0C1D2E3F4");
    expect(wrapped).toBe("https://www.amazon.com.br/dp/B0C1D2E3F4?tag=test-tag-20");
  });
});

describe("looksInternational", () => {
  it("detects 'Remessa Internacional' case-insensitively", () => {
    expect(looksInternational("Funko Pop Animation\nRemessa Internacional\nR$ 199,90")).toBe(true);
  });

  it("detects 'Amazon Global'", () => {
    expect(looksInternational("Vendido por Amazon Global Store")).toBe(true);
  });

  it("returns false for regular domestic product text", () => {
    expect(looksInternational("Box Livro Senhor dos Anéis\nR$ 199,90\nVendido por Amazon")).toBe(false);
  });
});
