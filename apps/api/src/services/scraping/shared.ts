import type { ElementHandle, Page } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { config } from "../../config.js";
import type { Store } from "../../../generated/prisma/client.js";

chromium.use(StealthPlugin());

export interface ScrapedOffer {
  externalId: string;
  store: Store;
  title: string;
  originalPrice: number;
  promotionalPrice: number;
  discountPercent: number;
  imageUrl: string | null;
  affiliateUrl: string;
  coupon?: string;
  paymentMethod?: string;
  isInternational?: boolean;
}

/** Rotated per page so requests don't share one fixed fingerprint. */
export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

export const BLOCK_PAGE_MARKERS = [
  "verificação de segurança",
  "captcha",
  "acesso negado",
  "tráfego suspeito",
  "para continuar, acesse",
];

export async function firstMatch(card: ElementHandle, selectors: string[]): Promise<ElementHandle | null> {
  for (const selector of selectors) {
    const handle = await card.$(selector);
    if (handle) return handle;
  }
  return null;
}

export async function textOf(card: ElementHandle, selectors: string[]): Promise<string | null> {
  const handle = await firstMatch(card, selectors);
  if (!handle) return null;

  const text = await handle.textContent();
  return text?.trim() || null;
}

export async function attrOf(card: ElementHandle, selectors: string[], attribute: string): Promise<string | null> {
  const handle = await firstMatch(card, selectors);
  if (!handle) return null;

  return handle.getAttribute(attribute);
}

export function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function parsePrice(text: string): number {
  const normalized = text
    .replace(/[^\d.,]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  return Number.parseFloat(normalized) || 0;
}

export function parseDiscount(text: string): number {
  const match = text.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

export function normalizePaymentMethod(text: string | null): string | undefined {
  if (!text) return undefined;
  return /pix/i.test(text) ? "no PIX" : undefined;
}

export function computeDiscountPercent(originalPrice: number, promotionalPrice: number): number {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - promotionalPrice) / originalPrice) * 100);
}

export function dedupeByExternalId(offers: ScrapedOffer[]): ScrapedOffer[] {
  const seen = new Map<string, ScrapedOffer>();
  for (const offer of offers) {
    if (!seen.has(offer.externalId)) {
      seen.set(offer.externalId, offer);
    }
  }
  return [...seen.values()];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** +/-30% randomization so requests don't land at a robotically fixed cadence. */
export function jitter(ms: number): number {
  const variance = ms * 0.3;
  return Math.round(ms - variance + Math.random() * variance * 2);
}

/** Fisher-Yates shuffle so keyword order isn't identical (and as easily fingerprinted) every run. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Splits items into fixed-size batches, so keywords can be scraped in short bursts instead of one long run. */
export function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

/** Parses `scheme://user:pass@host:port` into Playwright's launch-proxy shape. */
export function parseProxyUrl(proxyUrl: string | null): ProxyConfig | null {
  if (!proxyUrl) return null;

  const parsed = new URL(proxyUrl);
  const server = `${parsed.protocol}//${parsed.host}`;

  return {
    server,
    ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
  };
}

export async function gotoWithRetry(page: Page, url: string, attempts = 2): Promise<import("playwright").Response | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await page.goto(url, { waitUntil: "domcontentloaded" });
    } catch (error) {
      if (attempt === attempts) throw error;
      console.warn(`⚠️  Falha ao navegar para "${url}" (tentativa ${attempt}/${attempts}), tentando novamente...`);
      await delay(jitter(config.scraper.navDelayMs));
    }
  }
  return null;
}
