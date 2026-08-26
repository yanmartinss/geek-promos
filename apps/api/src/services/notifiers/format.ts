import type { Offer } from "./types.js";

function formatPriceCompact(value: unknown): string {
  const amount = Number(value);
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** "R$ 2216 no PIX" / "R$ 2216 à vista" — payment method always shown, defaulting to à vista. */
export function formatPriceLine(offer: Offer): string {
  const paymentMethod = offer.paymentMethod ?? "à vista";
  return `${formatPriceCompact(offer.promotionalPrice)} ${paymentMethod}`;
}

function buildCaption(offer: Offer, { includeLink }: { includeLink: boolean }): string {
  const lines = [offer.title, ""];

  if (offer.isInternational) {
    lines.push("🌍 Produto internacional — entrega mais demorada e pode ter taxação na alfândega", "");
  }

  if (offer.coupon) {
    lines.push(`${formatPriceLine(offer)} com cupom:`, offer.coupon);
  } else {
    lines.push(formatPriceLine(offer));
  }

  if (includeLink) {
    lines.push("", `🔗 ${offer.affiliateUrl}`);
  }

  return lines.join("\n");
}

/** Link de afiliado do ML pode passar de 1KB por causa do tracking — vai num botão, não na legenda, pra não estourar o limite de caption do Telegram. */
export function formatTelegramCaption(offer: Offer): string {
  return buildCaption(offer, { includeLink: false });
}

export function formatWhatsAppCaption(offer: Offer): string {
  return buildCaption(offer, { includeLink: true });
}

const TWEET_MAX_LENGTH = 280;
/** X encurta qualquer URL pra t.co, sempre 23 chars, não importa o tamanho real do link. */
const TWEET_URL_LENGTH = 23;

function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) return title;
  return `${title.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/** Texto do tuíte: título + preço + link de afiliado + CTA fixo pro grupo do Telegram. */
export function formatTwitterText(offer: Offer, telegramGroupUrl: string): string {
  const priceLine = formatPriceLine(offer);
  const linkLine = `🔗 ${offer.affiliateUrl}`;
  const ctaPrefix = "👉 Mais ofertas no Telegram: ";
  const ctaLine = `${ctaPrefix}${telegramGroupUrl}`;

  // URLs contam como TWEET_URL_LENGTH chars fixos no tuíte, não o tamanho real do link.
  const linkLineEffectiveLength = "🔗 ".length + TWEET_URL_LENGTH;
  const ctaLineEffectiveLength = ctaPrefix.length + TWEET_URL_LENGTH;
  const separatorsLength = "\n\n".length * 3;

  const fixedLength =
    priceLine.length + linkLineEffectiveLength + ctaLineEffectiveLength + separatorsLength;
  const titleBudget = Math.max(20, TWEET_MAX_LENGTH - fixedLength);
  const title = truncateTitle(offer.title, titleBudget);

  return [title, priceLine, linkLine, ctaLine].join("\n\n");
}
