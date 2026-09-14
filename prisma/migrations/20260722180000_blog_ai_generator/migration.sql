-- CreateEnum
CREATE TYPE "BlogAiPublishFrequency" AS ENUM ('EVERY_1_DAY', 'EVERY_2_DAYS', 'EVERY_3_DAYS', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "BlogAiTopicStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "BlogAiSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "BlogAiPublishFrequency" NOT NULL DEFAULT 'WEEKLY',
    "defaultCategoryId" TEXT,
    "autoPublish" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogAiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogAiTopic" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "categoryId" TEXT,
    "status" "BlogAiTopicStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "blogPostId" TEXT,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogAiTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogAiTopic_status_sortOrder_idx" ON "BlogAiTopic"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "BlogAiTopic_sortOrder_idx" ON "BlogAiTopic"("sortOrder");
