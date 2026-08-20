import { config } from "../../config.js";
import { EvolutionNotifier } from "./evolution.js";
import { TelegramNotifier } from "./telegram.js";
import type { Notifier } from "./types.js";

export type { Notifier, Offer } from "./types.js";
export { EvolutionNotifier } from "./evolution.js";
export { TelegramNotifier } from "./telegram.js";

export function createNotifiers(): Notifier[] {
  const notifiers: Notifier[] = [new TelegramNotifier(config.telegram.chatId)];
  const evolution = config.evolution;

  if (evolution) {
    notifiers.push(new EvolutionNotifier(evolution.whatsappId, evolution));
  }

  return notifiers;
}
