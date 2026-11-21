-- Acente siteleri tanımları

CREATE TABLE "AgencySite" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencySite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgencySite_active_idx" ON "AgencySite"("active");
CREATE INDEX "AgencySite_sortOrder_idx" ON "AgencySite"("sortOrder");

INSERT INTO "AgencySite" ("id", "name", "domain", "sortOrder", "active", "createdAt", "updatedAt")
VALUES
  ('agency_site_tatil_villacisi', 'TATİL VİLLACISI', 'tatilvillacisi.com', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
