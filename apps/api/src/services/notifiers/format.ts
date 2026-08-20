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
function formatPriceLine(offer: Offer): string {
  const paymentMethod = offer.paymentMethod ?? "à vista";
  return `${formatPriceCompact(offer.promotionalPrice)} ${paymentMethod}`;
}

function buildCaption(offer: Offer): string {
  const lines = [offer.title, ""];

  if (offer.isInternational) {
    lines.push("🌍 Produto internacional — entrega mais demorada e pode ter taxação na alfândega", "");
  }

  if (offer.coupon) {
    lines.push(`${formatPriceLine(offer)} com cupom:`, offer.coupon);
  } else {
    lines.push(formatPriceLine(offer));
  }

  lines.push("", `🔗 ${offer.affiliateUrl}`);

  return lines.join("\n");
}

export function formatTelegramCaption(offer: Offer): string {
  return buildCaption(offer);
}

export function formatWhatsAppCaption(offer: Offer): string {
  return buildCaption(offer);
}
