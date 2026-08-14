-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "whatsappApiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappPhoneNumberId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "whatsappAccessToken" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "whatsappBusinessAccountId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "whatsappApiVersion" TEXT NOT NULL DEFAULT 'v22.0',
ADD COLUMN     "whatsappWebhookVerifyToken" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "whatsappTestPhone" TEXT NOT NULL DEFAULT '';
