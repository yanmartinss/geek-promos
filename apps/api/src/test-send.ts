import { prisma } from "./lib/prisma.js";
import { dispatchOffer } from "./services/offer-dispatcher.js";

async function main(): Promise<void> {
  const externalId = `TEST-${Date.now()}`;

  const product = await prisma.product.upsert({
    where: {
      store_externalId: { store: "MERCADO_LIVRE", externalId },
    },
    create: {
      externalId,
      store: "MERCADO_LIVRE",
      title: "Livro de Teste - Promoção Mock",
      originalPrice: 499.9,
      promotionalPrice: 299.9,
      discountPercent: 40,
      imageUrl: "https://picsum.photos/seed/geek-promo/800/600",
      affiliateUrl: "https://mercadolivre.com.br/teste-promo",
      coupon: "HOJEVALEAPENA",
      paymentMethod: "no PIX",
    },
    update: {},
  });

  console.log(`Produto mockado criado: ${product.id} (${externalId})`);

  await dispatchOffer(product);

  console.log("Registro mantido no banco para inspeção.");
}

main()
  .catch((err: unknown) => {
    console.error("Falha no teste de envio:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
