-- Müşteri ulaşım kanalı tanımları

CREATE TABLE "CustomerContactChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContactChannel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerContactChannel_active_idx" ON "CustomerContactChannel"("active");
CREATE INDEX "CustomerContactChannel_sortOrder_idx" ON "CustomerContactChannel"("sortOrder");

INSERT INTO "CustomerContactChannel" ("id", "name", "sortOrder", "active", "createdAt", "updatedAt")
VALUES
  ('channel_teklif_iste', 'Teklif İste', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('channel_telefon', 'Telefon', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('channel_whatsapp', 'WhatsApp', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('channel_instagram', 'Instagram', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('channel_web', 'Web Sitesi', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('channel_email', 'E-posta', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('channel_diger', 'Diğer', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
