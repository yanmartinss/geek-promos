import { config } from "../../config.js";
import { EvolutionNotifier } from "./evolution.js";
import { TelegramNotifier } from "./telegram.js";
import { TwitterNotifier } from "./twitter.js";
import type { Notifier } from "./types.js";

export type { Notifier, Offer } from "./types.js";
export { EvolutionNotifier } from "./evolution.js";
export { TelegramNotifier } from "./telegram.js";
export { TwitterNotifier } from "./twitter.js";

export function createNotifiers(): Notifier[] {
  const notifiers: Notifier[] = [new TelegramNotifier(config.telegram.chatId)];
  const evolution = config.evolution;
  const twitter = config.twitter;

  if (evolution) {
    notifiers.push(new EvolutionNotifier(evolution.whatsappId, evolution));
  }

  if (twitter) {
    notifiers.push(new TwitterNotifier(twitter));
  }

  return notifiers;
}
