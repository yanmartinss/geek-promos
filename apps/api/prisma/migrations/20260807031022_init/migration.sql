/*
  Warnings:

  - The values [WHATSAPP_BROADCAST] on the enum `ChannelType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `endDate` on the `Promotion` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Promotion` table. All the data in the column will be lost.
  - You are about to alter the column `oldPrice` on the `Promotion` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `newPrice` on the `Promotion` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `discountPercentage` on the `Promotion` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(5,2)`.
  - You are about to drop the column `description` on the `Store` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Store` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Promotion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ChannelType_new" AS ENUM ('TELEGRAM_GROUP', 'TELEGRAM_CHANNEL', 'WHATSAPP_GROUP', 'WHATSAPP_CHANNEL');
ALTER TABLE "Channel" ALTER COLUMN "type" TYPE "ChannelType_new" USING ("type"::text::"ChannelType_new");
ALTER TYPE "ChannelType" RENAME TO "ChannelType_old";
ALTER TYPE "ChannelType_new" RENAME TO "ChannelType";
DROP TYPE "public"."ChannelType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Promotion" DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "oldPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "newPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "discountPercentage" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "ScrapingSource" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "description",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Store_name_key" ON "Store"("name");
