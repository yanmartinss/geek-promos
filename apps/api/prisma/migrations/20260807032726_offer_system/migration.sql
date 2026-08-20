/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Channel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Promotion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScrapingSource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Store` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_channelId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_promotionId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Promotion" DROP CONSTRAINT "Promotion_productId_fkey";

-- DropForeignKey
ALTER TABLE "Promotion" DROP CONSTRAINT "Promotion_storeId_fkey";

-- DropForeignKey
ALTER TABLE "ScrapingSource" DROP CONSTRAINT "ScrapingSource_storeId_fkey";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Channel";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "Promotion";

-- DropTable
DROP TABLE "ScrapingSource";

-- DropTable
DROP TABLE "Store";

-- DropEnum
DROP TYPE "ChannelType";

-- DropEnum
DROP TYPE "NotificationStatus";

-- CreateEnum
CREATE TYPE "Store" AS ENUM ('SHOPEE', 'MERCADO_LIVRE', 'AMAZON');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('TELEGRAM', 'WHATSAPP');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "store" "Store" NOT NULL,
    "title" TEXT NOT NULL,
    "originalPrice" DECIMAL(10,2) NOT NULL,
    "promotionalPrice" DECIMAL(10,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "imageUrl" TEXT,
    "affiliateUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sent_offers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "channelId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_store_externalId_key" ON "products"("store", "externalId");

-- CreateIndex
CREATE INDEX "sent_offers_productId_platform_sentAt_idx" ON "sent_offers"("productId", "platform", "sentAt");

-- AddForeignKey
ALTER TABLE "sent_offers" ADD CONSTRAINT "sent_offers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
