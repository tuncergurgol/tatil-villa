-- AlterTable
ALTER TABLE "Villa"
ADD COLUMN "descriptionAiUpdatedAt" TIMESTAMP(3),
ADD COLUMN "descriptionAiReport" TEXT NOT NULL DEFAULT '',
ADD COLUMN "seoAiUpdatedAt" TIMESTAMP(3),
ADD COLUMN "seoAiReport" TEXT NOT NULL DEFAULT '';
