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

function formatDiscountPercent(value: unknown): string {
  return `${Math.round(Number(value))}%`;
}

/** "De: R$ 89,90" */
export function formatOriginalPriceLine(offer: Offer): string {
  return `De: ${formatPriceCompact(offer.originalPrice)}`;
}

/** "Por: R$ 62,93 no PIX (30% OFF)" — payment method always shown, defaulting to à vista. */
export function formatPriceLine(offer: Offer): string {
  const paymentMethod = offer.paymentMethod ?? "à vista";
  return `Por: ${formatPriceCompact(offer.promotionalPrice)} ${paymentMethod} (${formatDiscountPercent(offer.discountPercent)} OFF)`;
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

  lines.push(formatOriginalPriceLine(offer));

  if (includeLink) {
    lines.push("", `🔗 ${offer.affiliateUrl}`);
  }

  return lines.join("\n");
}

/** Bem abaixo do limite de 1024 da legenda do Telegram, sobrando espaço pro título/preço/cupom. */
const MAX_INLINE_LINK_LENGTH = 300;

function hasShortAffiliateLink(offer: Offer): boolean {
  return offer.affiliateUrl.length <= MAX_INLINE_LINK_LENGTH;
}

/** Link de afiliado do ML pode passar de 1KB por causa do tracking — nesse caso vai num botão em vez da legenda, pra não estourar o limite do Telegram. */
export function formatTelegramCaption(offer: Offer): string {
  return buildCaption(offer, { includeLink: hasShortAffiliateLink(offer) });
}

/** Quando o link não coube na legenda (ver hasShortAffiliateLink), o notifier precisa oferecer um botão. */
export function needsLinkButton(offer: Offer): boolean {
  return !hasShortAffiliateLink(offer);
}

export function formatWhatsAppCaption(offer: Offer): string {
  return buildCaption(offer, { includeLink: true });
}
