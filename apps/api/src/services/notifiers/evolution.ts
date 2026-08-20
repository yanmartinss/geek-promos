import { formatWhatsAppCaption } from "./format.js";
import type { Notifier, Offer } from "./types.js";

export interface EvolutionConfig {
  url: string;
  apiKey: string;
  instance: string;
}

export class EvolutionNotifier implements Notifier {
  readonly platform = "WHATSAPP" as const;

  constructor(
    readonly channelId: string,
    private readonly config: EvolutionConfig,
  ) {}

  async send(offer: Offer): Promise<void> {
    if (!offer.imageUrl) {
      throw new Error("Produto sem imagem para envio no WhatsApp");
    }

    const { url, apiKey, instance } = this.config;
    const response = await fetch(`${url}/message/sendMedia/${instance}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
        body: JSON.stringify({
          number: this.channelId,
          mediatype: "image",
          media: offer.imageUrl,
          caption: formatWhatsAppCaption(offer),
          mimetype: "image/jpeg",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Evolution API respondeu com status ${response.status}`);
    }
  }
}
