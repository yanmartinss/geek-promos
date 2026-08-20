import { prisma } from "./lib/prisma.js";
import { getPromotionsFromMercadoLivre } from "./services/scraping/mercado-livre.service.js";

async function main() {
  const promotions = await getPromotionsFromMercadoLivre();
  console.log(`🔎 ${promotions.length} oferta(s) encontrada(s) após filtros.`);
  for (const p of promotions) {
    const tag = p.isInternational ? " | 🌍 INTERNACIONAL" : "";
    console.log(`  - ${p.title} | R$${p.promotionalPrice} (${p.discountPercent}% off)${tag}`);
  }
}

main()
  .catch((err: unknown) => {
    console.error("Falha ao rodar o scraper:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
