-- Tarih öğrenme örnekleri (WhatsApp takvim yapay zeka eğitimi)
CREATE TABLE "WhatsappCalendarDateTraining" (
    "id" TEXT NOT NULL,
    "samplePattern" TEXT NOT NULL,
    "startDateKey" TEXT NOT NULL,
    "endDateKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappCalendarDateTraining_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappCalendarDateTraining_samplePattern_startDateKey_endDateKey_key" ON "WhatsappCalendarDateTraining"("samplePattern", "startDateKey", "endDateKey");

CREATE INDEX "WhatsappCalendarDateTraining_active_sortOrder_idx" ON "WhatsappCalendarDateTraining"("active", "sortOrder");

INSERT INTO "WhatsappCalendarDateTraining" ("id", "samplePattern", "startDateKey", "endDateKey", "active", "sortOrder", "createdAt", "updatedAt")
VALUES (
    'wpdt_1_8_agustos',
    '1-8 ağaustos',
    '2026-08-01',
    '2026-08-08',
    true,
    10,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("samplePattern", "startDateKey", "endDateKey") DO NOTHING;
