import type { Browser, ElementHandle } from "playwright";
import { chromium } from "playwright-extra";

import { config } from "../../config.js";
import {
  BLOCK_PAGE_MARKERS,
  attrOf,
  chunk,
  computeDiscountPercent,
  dedupeByExternalId,
  delay,
  firstMatch,
  gotoWithRetry,
  hashString,
  jitter,
  normalizePaymentMethod,
  parseDiscount,
  parsePrice,
  parseProxyUrl,
  randomUserAgent,
  shuffle,
  textOf,
  type ScrapedOffer,
} from "./shared.js";

export type { ScrapedOffer };

const CARD_SELECTOR = "li.ui-search-layout__item, div.ui-search-result__wrapper";
const LINK_SELECTORS = ["a.ui-search-link", "a.poly-component__title", "a[href*='/p/']", "a[href*='MLB-']"];
const TITLE_SELECTORS = [".ui-search-item__title", ".poly-component__title", "h2"];
const ORIGINAL_PRICE_SELECTORS = [".ui-search-price__original-value", "s .andes-money-amount__fraction"];
const PROMO_PRICE_SELECTORS = [
  ".ui-search-price__second-line .andes-money-amount__fraction",
  ".poly-price__current .andes-money-amount__fraction",
];
const DISCOUNT_SELECTORS = [".ui-search-price__discount", ".andes-money-amount__discount"];
const PAYMENT_METHOD_SELECTORS = [".poly-price__unit-description"];

export function looksInternational(cardText: string): boolean {
  return /internacional/i.test(cardText);
}

export async function getPromotionsFromMercadoLivre(): Promise<ScrapedOffer[]> {
  const proxy = parseProxyUrl(config.scraper.proxyUrl);
  if (proxy) {
    console.log(`🌐 Usando proxy ${proxy.server} para o scraper.`);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
    ...(proxy ? { proxy } : {}),
  });
  const results: ScrapedOffer[] = [];
  const state = { blocked: false };

  try {
    const batches = chunk(shuffle(config.scraper.keywords), config.scraper.batchSize);

    for (const [index, batch] of batches.entries()) {
      const queue = [...batch];
      const workerCount = Math.min(config.scraper.concurrency, queue.length || 1);
      const workers = Array.from({ length: workerCount }, () => runWorker(browser, queue, results, state));
      await Promise.all(workers);

      if (state.blocked) break;

      const isLastBatch = index === batches.length - 1;
      if (!isLastBatch) {
        console.log(`⏸️  Lote ${index + 1}/${batches.length} concluído, pausando antes do próximo.`);
        await delay(jitter(config.scraper.batchDelayMs));
      }
    }

    if (state.blocked) {
      console.warn(
        `⚠️  Execução interrompida após bloqueio do Mercado Livre — pausando por ${config.scraper.blockCooldownMs / 1000}s antes de encerrar esta rodada.`,
      );
      await delay(config.scraper.blockCooldownMs);
    }
  } finally {
    await browser.close();
  }

  return dedupeByExternalId(results);
}

async function runWorker(browser: Browser, queue: string[], results: ScrapedOffer[], state: { blocked: boolean }): Promise<void> {
  while (queue.length > 0 && !state.blocked) {
    const keyword = queue.shift();
    if (!keyword) return;

    try {
      const { offers, blocked } = await scrapeKeyword(browser, keyword);
      results.push(...offers);
      if (blocked) state.blocked = true;
    } catch (error) {
      console.error(`❌ Falha ao raspar palavra-chave "${keyword}":`, error);
    }

    if (!state.blocked) await delay(jitter(config.scraper.navDelayMs));
  }
}

async function scrapeKeyword(browser: Browser, keyword: string): Promise<{ offers: ScrapedOffer[]; blocked: boolean }> {
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
    const searchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(keyword)}_Deals_true`;
    const response = await gotoWithRetry(page, searchUrl);

    const status = response?.status();
    if (status === 429 || status === 403) {
      console.warn(`⚠️  HTTP ${status} ao raspar "${keyword}", provável bloqueio — pulando.`);
      return { offers: [], blocked: true };
    }

    if (/\/gz\/account-verification|\/security\/suspicious_traffic/.test(page.url())) {
      console.warn(`⚠️  Bloqueio de tráfego suspeito detectado ao raspar "${keyword}", pulando.`);
      return { offers: [], blocked: true };
    }

    const bodyText = (await page.textContent("body").catch(() => null))?.toLowerCase() ?? "";
    if (BLOCK_PAGE_MARKERS.some((marker) => bodyText.includes(marker))) {
      console.warn(`⚠️  Possível bloqueio detectado ao raspar "${keyword}", pulando.`);
      return { offers: [], blocked: true };
    }

    await page.waitForSelector(CARD_SELECTOR, { timeout: config.scraper.pageTimeoutMs }).catch(() => null);

    const cardHandles = await page.$$(CARD_SELECTOR);
    const offers: ScrapedOffer[] = [];

    for (const card of cardHandles.slice(0, config.scraper.maxItemsPerKeyword)) {
      const offer = await extractOfferFromCard(card).catch((error: unknown) => {
        console.warn("⚠️  Card ignorado por erro de extração:", error);
        return null;
      });

      if (offer && config.scraper.titleKeywordFilter.test(offer.title)) {
        offers.push(offer);
      }
    }

    return { offers, blocked: false };
  } finally {
    await page.close();
  }
}

async function extractOfferFromCard(card: ElementHandle): Promise<ScrapedOffer | null> {
  const link = await firstMatch(card, LINK_SELECTORS);
  const productUrl = link ? await link.getAttribute("href") : null;
  if (!productUrl) return null;

  const externalId = extractExternalId(productUrl);
  if (!externalId) return null;

  const title = await textOf(card, TITLE_SELECTORS);
  const promoPriceText = await textOf(card, PROMO_PRICE_SELECTORS);
  const originalPriceText = await textOf(card, ORIGINAL_PRICE_SELECTORS);
  const discountText = await textOf(card, DISCOUNT_SELECTORS);
  const paymentMethodText = await textOf(card, PAYMENT_METHOD_SELECTORS);
  const imageUrl = (await attrOf(card, ["img"], "data-src")) ?? (await attrOf(card, ["img"], "src"));

  if (!title || !promoPriceText || !imageUrl) return null;

  const promotionalPrice = parsePrice(promoPriceText);
  const originalPrice = originalPriceText ? parsePrice(originalPriceText) : promotionalPrice;
  const discountPercent = discountText ? parseDiscount(discountText) : computeDiscountPercent(originalPrice, promotionalPrice);

  if (discountPercent < config.offer.minDiscountPercent) return null;

  const paymentMethod = normalizePaymentMethod(paymentMethodText);
  const cardText = (await card.textContent().catch(() => null)) ?? "";

  return {
    externalId,
    store: "MERCADO_LIVRE",
    title,
    originalPrice,
    promotionalPrice,
    discountPercent,
    imageUrl,
    affiliateUrl: wrapAffiliateLink(productUrl),
    ...(paymentMethod ? { paymentMethod } : {}),
    isInternational: looksInternational(cardText),
  };
}

function wrapAffiliateLink(url: string): string {
  const wrapped = new URL(url);
  wrapped.searchParams.set("matt_word", config.mercadoLivreApi.mattWord);
  wrapped.searchParams.set("matt_tool", config.mercadoLivreApi.mattTool);
  return wrapped.toString();
}

export function extractExternalId(url: string): string | null {
  const match = url.match(/MLB-?\d+/i);
  if (match) return match[0].replace("-", "").toUpperCase();

  try {
    const parsed = new URL(url);
    return `HASH-${hashString(parsed.pathname + parsed.search)}`;
  } catch {
    return null;
  }
}
