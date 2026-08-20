import type { Platform, Product } from "../../../generated/prisma/client.js";

export type Offer = Product;

export interface Notifier {
  readonly platform: Platform;
  readonly channelId: string;
  send(offer: Offer): Promise<void>;
}
