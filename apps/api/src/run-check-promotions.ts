import { prisma } from "./lib/prisma.js";
import { checkPromotionsJob } from "./jobs/check-promotion.job.js";

console.log("🔎 Buscando ofertas e disparando para os canais configurados...");

checkPromotionsJob()
  .then(() => console.log("✅ Concluído."))
  .catch((err: unknown) => {
    console.error("❌ Falha ao checar promoções:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
