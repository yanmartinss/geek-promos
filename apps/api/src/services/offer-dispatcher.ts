import { config } from "../config.js";
import { createNotifiers, type Offer } from "./notifiers/index.js";
import { isOfferAlreadySent, recordSentOffer } from "./offers/offer-repository.js";

export async function dispatchOffer(offer: Offer): Promise<void> {
  for (const notifier of createNotifiers()) {
    const alreadySent = await isOfferAlreadySent(
      offer.externalId,
      offer.store,
      notifier.platform,
      config.offer.dedupDays,
    );

    if (alreadySent) {
      console.log(`⏭️  Oferta já enviada: ${offer.title} (${notifier.platform})`);
      continue;
    }

    try {
      await notifier.send(offer);
      await recordSentOffer(offer.id, notifier.platform, notifier.channelId);
      console.log(`✅ Oferta enviada: ${offer.title} (${notifier.platform})`);
    } catch (error) {
      console.error(`❌ Falha ao enviar oferta ${offer.title} (${notifier.platform}):`, error);
    }
  }
}
