import { Telegraf } from "telegraf";

import { config } from "../../config.js";
import { formatTelegramCaption } from "./format.js";
import type { Notifier, Offer } from "./types.js";

const bot = new Telegraf(config.telegram.botToken);

export class TelegramNotifier implements Notifier {
  readonly platform = "TELEGRAM" as const;

  constructor(readonly channelId: string) {}

  async send(offer: Offer): Promise<void> {
    if (!offer.imageUrl) {
      throw new Error("Produto sem imagem para envio no Telegram");
    }

    await bot.telegram.sendPhoto(this.channelId, offer.imageUrl, {
      caption: formatTelegramCaption(offer),
    });
  }
}
