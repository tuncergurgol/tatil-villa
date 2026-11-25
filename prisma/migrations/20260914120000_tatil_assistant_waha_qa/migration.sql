-- WAHA konuşmalarından YumYum için birleştirilmiş soru-cevap kayıtları
CREATE TABLE IF NOT EXISTS "TatilAssistantWahaQa" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "sampleChatName" TEXT NOT NULL DEFAULT '',
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "importedExampleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TatilAssistantWahaQa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TatilAssistantWahaQa_fingerprint_key" ON "TatilAssistantWahaQa"("fingerprint");
CREATE UNIQUE INDEX IF NOT EXISTS "TatilAssistantWahaQa_importedExampleId_key" ON "TatilAssistantWahaQa"("importedExampleId");
CREATE INDEX IF NOT EXISTS "TatilAssistantWahaQa_occurrenceCount_idx" ON "TatilAssistantWahaQa"("occurrenceCount");
CREATE INDEX IF NOT EXISTS "TatilAssistantWahaQa_lastSeenAt_idx" ON "TatilAssistantWahaQa"("lastSeenAt");

DO $$ BEGIN
  ALTER TABLE "TatilAssistantWahaQa"
    ADD CONSTRAINT "TatilAssistantWahaQa_importedExampleId_fkey"
    FOREIGN KEY ("importedExampleId") REFERENCES "TatilAssistantExample"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
