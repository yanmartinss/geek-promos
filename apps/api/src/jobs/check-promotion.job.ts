import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { dispatchOffer } from "../services/offer-dispatcher.js";
import { getPromotionsFromAmazon } from "../services/scraping/amazon.service.js";
import { getPromotionsFromMercadoLivre } from "../services/scraping/mercado-livre.service.js";

/** Espaçamento entre disparos pra não estourar o rate limit do Telegram (~20 msgs/min por chat). */
const DISPATCH_DELAY_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkPromotionsJob() {
  const sources = [getPromotionsFromMercadoLivre()];
  if (config.amazon) {
    sources.push(getPromotionsFromAmazon());
  }

  const promotions = (await Promise.all(sources)).flat();

  for (const promotion of promotions) {
    const product = await prisma.product.upsert({
      where: {
        store_externalId: { store: promotion.store, externalId: promotion.externalId },
      },
      create: promotion,
      update: {
        title: promotion.title,
        originalPrice: promotion.originalPrice,
        promotionalPrice: promotion.promotionalPrice,
        discountPercent: promotion.discountPercent,
        imageUrl: promotion.imageUrl,
        affiliateUrl: promotion.affiliateUrl,
        coupon: promotion.coupon ?? null,
        paymentMethod: promotion.paymentMethod ?? null,
        isInternational: promotion.isInternational ?? false,
      },
    });

    await dispatchOffer(product);
    await delay(DISPATCH_DELAY_MS);
  }
}
