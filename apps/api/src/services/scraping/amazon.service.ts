import type { Browser, ElementHandle } from "playwright";
import { chromium } from "playwright-extra";

import { config } from "../../config.js";
import {
  BLOCK_PAGE_MARKERS,
  MOTO_KEYWORD_FILTER,
  attrOf,
  computeDiscountPercent,
  dedupeByExternalId,
  delay,
  firstMatch,
  gotoWithRetry,
  hashString,
  jitter,
  parsePrice,
  parseProxyUrl,
  randomUserAgent,
  textOf,
  type ScrapedOffer,
} from "./shared.js";

export type { ScrapedOffer };

const CARD_SELECTOR = 'div[data-component-type="s-search-result"]';
const LINK_SELECTORS = ["h2 a.a-link-normal", "a.a-link-normal.s-line-clamp-2", "a.a-link-normal.s-no-outline"];
const TITLE_SELECTORS = ["h2 span", "h2 a span", ".a-size-medium.a-color-base.a-text-normal"];
const PROMO_PRICE_SELECTORS = [".a-price:not([data-a-strike]) .a-offscreen", "span.a-price .a-offscreen"];
const ORIGINAL_PRICE_SELECTORS = [".a-price[data-a-strike] .a-offscreen", "span.a-text-price .a-offscreen"];
const BLOCK_PAGE_MARKERS_AMAZON = ["digite os caracteres", "robot check", "automated access"];
const INTERNATIONAL_MARKERS = /remessa internacional|enviado (do|pelo) exterior|amazon global|parceiro internacional/i;

export function looksInternational(cardText: string): boolean {
  return INTERNATIONAL_MARKERS.test(cardText);
}

export async function getPromotionsFromAmazon(): Promise<ScrapedOffer[]> {
  if (!config.amazon) {
    throw new Error("Amazon scraping chamado sem AMAZON_ASSOCIATE_TAG configurado");
  }

  const proxy = parseProxyUrl(config.scraper.proxyUrl);
  if (proxy) {
    console.log(`🌐 Usando proxy ${proxy.server} para o scraper da Amazon.`);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
    ...(proxy ? { proxy } : {}),
  });
  const results: ScrapedOffer[] = [];

  try {
    const queue = [...config.scraper.keywords];
    const workerCount = Math.min(config.scraper.concurrency, queue.length || 1);
    const workers = Array.from({ length: workerCount }, () => runWorker(browser, queue, results));
    await Promise.all(workers);
  } finally {
    await browser.close();
  }

  return dedupeByExternalId(results);
}

async function runWorker(browser: Browser, queue: string[], results: ScrapedOffer[]): Promise<void> {
  while (queue.length > 0) {
    const keyword = queue.shift();
    if (!keyword) return;

    try {
      const items = await scrapeKeyword(browser, keyword);
      results.push(...items);
    } catch (error) {
      console.error(`❌ Falha ao raspar palavra-chave "${keyword}" na Amazon:`, error);
    }

    await delay(jitter(config.scraper.navDelayMs));
  }
}

async function scrapeKeyword(browser: Browser, keyword: string): Promise<ScrapedOffer[]> {
  const page = await browser.newPage({ userAgent: randomUserAgent() });
  page.setDefaultTimeout(config.scraper.pageTimeoutMs);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  await page.route(/\.(png|jpe?g|webp|gif|woff2?|ttf)(\?|$)/, (route) => {
    if (route.request().resourceType() === "image" || route.request().resourceType() === "font") {
      return route.abort();
    }
    return route.continue();
  });

  try {
    const searchUrl = `https://www.amazon.com.br/s?k=${encodeURIComponent(keyword)}`;
    await gotoWithRetry(page, searchUrl);

    const bodyText = (await page.textContent("body").catch(() => null))?.toLowerCase() ?? "";
    if ([...BLOCK_PAGE_MARKERS, ...BLOCK_PAGE_MARKERS_AMAZON].some((marker) => bodyText.includes(marker))) {
      console.warn(`⚠️  Possível bloqueio detectado ao raspar "${keyword}" na Amazon, pulando.`);
      return [];
    }

    await page.waitForSelector(CARD_SELECTOR, { timeout: config.scraper.pageTimeoutMs }).catch(() => null);

    const cardHandles = await page.$$(CARD_SELECTOR);
    const offers: ScrapedOffer[] = [];

    for (const card of cardHandles.slice(0, config.scraper.maxItemsPerKeyword)) {
      const offer = await extractOfferFromCard(card).catch((error: unknown) => {
        console.warn("⚠️  Card ignorado por erro de extração:", error);
        return null;
      });

      if (offer && MOTO_KEYWORD_FILTER.test(offer.title)) {
        offers.push(offer);
      }
    }

    return offers;
  } finally {
    await page.close();
  }
}

async function extractOfferFromCard(card: ElementHandle): Promise<ScrapedOffer | null> {
  const link = await firstMatch(card, LINK_SELECTORS);
  const rawHref = link ? await link.getAttribute("href") : null;
  if (!rawHref) return null;

  const productUrl = new URL(rawHref, "https://www.amazon.com.br").toString();
  const externalId = extractExternalId(productUrl);
  if (!externalId) return null;

  const title = await textOf(card, TITLE_SELECTORS);
  const promoPriceText = await textOf(card, PROMO_PRICE_SELECTORS);
  const originalPriceText = await textOf(card, ORIGINAL_PRICE_SELECTORS);
  const imageUrl = await attrOf(card, ["img.s-image"], "src");

  if (!title || !promoPriceText || !imageUrl) return null;

  const promotionalPrice = parsePrice(promoPriceText);
  const originalPrice = originalPriceText ? parsePrice(originalPriceText) : promotionalPrice;
  // Amazon não expõe um badge confiável de "X% off" no card de busca (diferente da ML) —
  // os candidatos testados (.a-badge-text etc.) às vezes trazem textos não relacionados a
  // desconto (ex.: "Menor preço em 365 dias"), então o percentual sempre é calculado a partir dos preços.
  const discountPercent = computeDiscountPercent(originalPrice, promotionalPrice);

  if (discountPercent < config.offer.minDiscountPercent) return null;

  const cardText = (await card.textContent().catch(() => null)) ?? "";

  return {
    externalId,
    store: "AMAZON",
    title,
    originalPrice,
    promotionalPrice,
    discountPercent,
    imageUrl,
    affiliateUrl: externalId.startsWith("HASH-") ? wrapAffiliateLinkFallback(productUrl) : wrapAffiliateLink(externalId),
    isInternational: looksInternational(cardText),
  };
}

/** Constrói o link canônico do produto a partir do ASIN — mais curto e sem os parâmetros de rastreamento da busca. */
export function wrapAffiliateLink(asin: string): string {
  if (!config.amazon) {
    throw new Error("Amazon scraping chamado sem AMAZON_ASSOCIATE_TAG configurado");
  }

  return `https://www.amazon.com.br/dp/${asin}?tag=${config.amazon.associateTag}`;
}

/** Usado quando não foi possível extrair um ASIN (ex.: link de redirecionamento sem padrão reconhecível). */
function wrapAffiliateLinkFallback(url: string): string {
  if (!config.amazon) {
    throw new Error("Amazon scraping chamado sem AMAZON_ASSOCIATE_TAG configurado");
  }

  const wrapped = new URL(url);
  wrapped.searchParams.set("tag", config.amazon.associateTag);
  return wrapped.toString();
}

export function extractExternalId(url: string): string | null {
  const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  if (match) return match[1]!.toUpperCase();

  try {
    const parsed = new URL(url);
    return `HASH-${hashString(parsed.pathname + parsed.search)}`;
  } catch {
    return null;
  }
}
