-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('TELEGRAM_GROUP', 'WHATSAPP_BROADCAST');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- DropIndex
DROP INDEX "Notification_promotionId_key";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "channelId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "sentAt" DROP NOT NULL,
ALTER COLUMN "sentAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Channel" (
    "id" SERIAL NOT NULL,
    "type" "ChannelType" NOT NULL,
    "name" TEXT NOT NULL,
    "telegramChatId" TEXT,
    "whatsappId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_promotionId_channelId_key" ON "Notification"("promotionId", "channelId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

