-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "smtpProvider" TEXT NOT NULL DEFAULT 'google',
ADD COLUMN     "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
ADD COLUMN     "smtpPort" INTEGER NOT NULL DEFAULT 587,
ADD COLUMN     "smtpSecure" TEXT NOT NULL DEFAULT 'starttls',
ADD COLUMN     "smtpUser" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "smtpPassword" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "smtpFromEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "smtpFromName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "smtpEnabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "CompanySettings"
SET
  "smtpProvider" = 'google',
  "smtpHost" = 'smtp.gmail.com',
  "smtpPort" = 587,
  "smtpSecure" = 'starttls',
  "smtpUser" = 'rezervasyon@tatildeyiz.com.tr',
  "smtpPassword" = 'Rez@1311@',
  "smtpFromEmail" = 'rezervasyon@tatildeyiz.com.tr',
  "smtpFromName" = 'tatildeyiz.com.tr',
  "smtpEnabled" = true
WHERE "id" = 'default'
  AND "smtpUser" = '';
