-- Detaylı arama sayfasında listelenecek olanaklar için işaret
ALTER TABLE "Amenity" ADD COLUMN IF NOT EXISTS "showInSearch" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Amenity_showInSearch_idx" ON "Amenity"("showInSearch");
