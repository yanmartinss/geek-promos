import type { Platform, Store } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function isOfferAlreadySent(
  externalId: string,
  store: Store,
  platform: Platform,
  days: number,
): Promise<boolean> {
  const since = new Date(Date.now() - days * DAY_MS);

  const sentCount = await prisma.sentOffer.count({
    where: {
      platform,
      sentAt: { gte: since },
      product: { store, externalId },
    },
  });

  return sentCount > 0;
}

export async function recordSentOffer(
  productId: string,
  platform: Platform,
  channelId: string,
) {
  return prisma.sentOffer.create({
    data: { productId, platform, channelId },
  });
}
