import { TwitterApi } from "twitter-api-v2";

import { countSentSince, getLastSentAt } from "../offers/offer-repository.js";
import { formatTwitterText } from "./format.js";
import type { Notifier, Offer } from "./types.js";

export interface TwitterConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
  telegramGroupUrl: string;
  minDiscountPercent: number;
  highInterestFilter: RegExp;
  dailyLimit: number;
  minIntervalMinutes: number;
}

const MINUTE_MS = 60 * 1000;

/** Só as melhores ofertas vão pro X: desconto alto ou item de alto interesse (box, luxo, colecionador...). */
export function matchesBestOfferFilter(offer: Offer, config: TwitterConfig): boolean {
  const discount = Number(offer.discountPercent);
  return discount >= config.minDiscountPercent || config.highInterestFilter.test(offer.title);
}

export class TwitterNotifier implements Notifier {
  readonly platform = "TWITTER" as const;
  readonly channelId = "x";

  private readonly client: TwitterApi;

  constructor(private readonly config: TwitterConfig) {
    this.client = new TwitterApi({
      appKey: config.appKey,
      appSecret: config.appSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessSecret,
    });
  }

  async shouldSend(offer: Offer): Promise<boolean> {
    if (!matchesBestOfferFilter(offer, this.config)) {
      return false;
    }

    const sinceStartOfDay = new Date();
    sinceStartOfDay.setHours(0, 0, 0, 0);

    const sentToday = await countSentSince(this.platform, sinceStartOfDay);
    if (sentToday >= this.config.dailyLimit) {
      console.log(`⏭️  Limite diário do X atingido (${this.config.dailyLimit}), pulando: ${offer.title}`);
      return false;
    }

    const lastSentAt = await getLastSentAt(this.platform);
    const minIntervalMs = this.config.minIntervalMinutes * MINUTE_MS;
    if (lastSentAt && Date.now() - lastSentAt.getTime() < minIntervalMs) {
      console.log(`⏭️  Intervalo mínimo entre posts no X ainda não passou, pulando: ${offer.title}`);
      return false;
    }

    return true;
  }

  async send(offer: Offer): Promise<void> {
    await this.client.v2.tweet(formatTwitterText(offer, this.config.telegramGroupUrl));
  }
}
