-- CRM müşteri etiketleri ve ilk kayıt zamanı

ALTER TABLE "Customer" ADD COLUMN "firstContactAt" TIMESTAMP(3);

CREATE TABLE "CustomerTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerTagOnCustomer" (
    "customerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTagOnCustomer_pkey" PRIMARY KEY ("customerId","tagId")
);

CREATE UNIQUE INDEX "CustomerTag_name_key" ON "CustomerTag"("name");
CREATE INDEX "CustomerTag_active_idx" ON "CustomerTag"("active");
CREATE INDEX "CustomerTag_sortOrder_idx" ON "CustomerTag"("sortOrder");
CREATE INDEX "CustomerTagOnCustomer_tagId_idx" ON "CustomerTagOnCustomer"("tagId");
CREATE INDEX "Customer_firstContactAt_idx" ON "Customer"("firstContactAt");

ALTER TABLE "CustomerTagOnCustomer" ADD CONSTRAINT "CustomerTagOnCustomer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerTagOnCustomer" ADD CONSTRAINT "CustomerTagOnCustomer_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CustomerTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CustomerContactChannel" ("id", "name", "sortOrder", "active", "createdAt", "updatedAt")
VALUES
  ('channel_sizi_arayalim', 'Sizi Arayalım', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('channel_facebook_lead', 'Facebook Lead', 11, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('channel_rezervasyon', 'Rezervasyon', 12, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('channel_uygunluk_ara', 'Uygunluk Ara', 13, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CustomerTag" ("id", "name", "sortOrder", "active", "createdAt", "updatedAt")
VALUES
  ('tag_konaklama', 'KONAKLAMA', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_2018', '2018', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_2019', '2019', 11, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_2020', '2020', 12, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_2021', '2021', 13, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_2022', '2022', 14, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_2023', '2023', 15, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_2024', '2024', 16, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_2025', '2025', 17, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_2026', '2026', 18, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

UPDATE "Customer"
SET "firstContactAt" = "createdAt"
WHERE "firstContactAt" IS NULL;
