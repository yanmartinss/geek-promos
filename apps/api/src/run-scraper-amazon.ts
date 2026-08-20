import { prisma } from "./lib/prisma.js";
import { getPromotionsFromAmazon } from "./services/scraping/amazon.service.js";

async function main() {
  const promotions = await getPromotionsFromAmazon();
  console.log(`🔎 ${promotions.length} oferta(s) encontrada(s) após filtros.`);
  for (const p of promotions) {
    const tag = p.isInternational ? " | 🌍 INTERNACIONAL" : "";
    console.log(`  - ${p.title} | R$${p.promotionalPrice} (${p.discountPercent}% off) | ${p.affiliateUrl}${tag}`);
  }
}

main()
  .catch((err: unknown) => {
    console.error("Falha ao rodar o scraper da Amazon:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
