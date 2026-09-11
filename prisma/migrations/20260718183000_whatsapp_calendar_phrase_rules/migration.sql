-- CreateEnum
CREATE TYPE "WhatsappCalendarPhraseIntent" AS ENUM ('CLOSE', 'OPEN', 'OPTION');

-- CreateTable
CREATE TABLE "WhatsappCalendarPhraseRule" (
    "id" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "intent" "WhatsappCalendarPhraseIntent" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappCalendarPhraseRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsappCalendarPhraseRule_active_sortOrder_idx" ON "WhatsappCalendarPhraseRule"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappCalendarPhraseRule_phrase_intent_key" ON "WhatsappCalendarPhraseRule"("phrase", "intent");

-- Seed: yaygın örnek ifadeler
INSERT INTO "WhatsappCalendarPhraseRule" ("id", "phrase", "intent", "active", "sortOrder", "createdAt", "updatedAt") VALUES
  ('wphr_close_dolu', 'dolu', 'CLOSE', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_close_kapatalim', 'kapatalım', 'CLOSE', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_close_kapattik', 'kapattık', 'CLOSE', true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_close_kiralandi', 'kiralandı', 'CLOSE', true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_open_acik', 'açık', 'OPEN', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_open_acalim', 'açalım', 'OPEN', true, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_open_musait', 'müsait', 'OPEN', true, 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_open_iptal', 'iptal', 'OPEN', true, 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wphr_option_opsiyon', 'opsiyon', 'OPTION', true, 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
