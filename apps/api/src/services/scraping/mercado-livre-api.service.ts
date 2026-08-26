import { config } from "../../config.js";
import type { Store } from "../../../generated/prisma/client.js";
import { getAccessToken, refreshAccessToken } from "../ml-auth/token-store.js";
import { computeDiscountPercent, dedupeByExternalId, type ScrapedOffer } from "./shared.js";

interface MlSearchItem {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  permalink: string;
  thumbnail?: string;
}

interface MlSearchResponse {
  results: MlSearchItem[];
}

export async function getPromotionsFromMercadoLivreApi(): Promise<ScrapedOffer[]> {
  const results: ScrapedOffer[] = [];

  for (const keyword of config.scraper.keywords) {
    try {
      const items = await searchKeyword(keyword);
      results.push(...items);
    } catch (error) {
      console.error(`❌ Falha ao buscar palavra-chave "${keyword}" na API do Mercado Livre:`, error);
    }
  }

  return dedupeByExternalId(results);
}

async function searchKeyword(keyword: string): Promise<ScrapedOffer[]> {
  const data = await fetchSearch(keyword);

  const offers: ScrapedOffer[] = [];
  for (const item of data.results.slice(0, config.scraper.maxItemsPerKeywordMercadoLivre)) {
    const offer = await toScrapedOffer(item);
    if (offer) offers.push(offer);
  }
  return offers;
}

async function fetchSearch(keyword: string, isRetry = false): Promise<MlSearchResponse> {
  const url = new URL(`https://api.mercadolibre.com/sites/${config.mercadoLivreApi.siteId}/search`);
  url.searchParams.set("q", keyword);
  url.searchParams.set("limit", String(config.scraper.maxItemsPerKeywordMercadoLivre));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });

  if (response.status === 401 && !isRetry) {
    await refreshAccessToken();
    return fetchSearch(keyword, true);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Busca falhou (${response.status}): ${body}`);
  }

  return response.json() as Promise<MlSearchResponse>;
}

async function toScrapedOffer(item: MlSearchItem): Promise<ScrapedOffer | null> {
  if (!item.original_price || item.original_price <= item.price) return null;

  const discountPercent = computeDiscountPercent(item.original_price, item.price);
  if (discountPercent < config.offer.minDiscountPercent) return null;

  return {
    externalId: item.id,
    store: "MERCADO_LIVRE" as Store,
    title: item.title,
    originalPrice: item.original_price,
    promotionalPrice: item.price,
    discountPercent,
    imageUrl: item.thumbnail ?? null,
    affiliateUrl: wrapAffiliateLink(item.permalink),
  };
}

function wrapAffiliateLink(permalink: string): string {
  const url = new URL(permalink);
  url.searchParams.set("matt_word", config.mercadoLivreApi.mattWord);
  url.searchParams.set("matt_tool", config.mercadoLivreApi.mattTool);
  return url.toString();
}
