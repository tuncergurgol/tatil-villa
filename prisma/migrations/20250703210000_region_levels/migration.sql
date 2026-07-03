-- CreateEnum
CREATE TYPE "RegionLevel" AS ENUM ('IL', 'ILCE', 'MAHALLE');

-- AlterTable: add level with temporary default for existing rows
ALTER TABLE "Region" ADD COLUMN "level" "RegionLevel" NOT NULL DEFAULT 'MAHALLE';

-- CreateIndex
CREATE INDEX "Region_level_idx" ON "Region"("level");

-- Seed province / district hierarchy and reparent existing destination rows
INSERT INTO "Region" (
  "id", "slug", "name", "level", "image", "active", "published",
  "showInSearch", "showInOffer", "showOnHome", "sortOrder", "updatedAt"
) VALUES
  ('reg_il_antalya', 'antalya', 'Antalya', 'IL', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', true, true, true, false, true, 1, NOW()),
  ('reg_il_mugla', 'mugla', 'Muğla', 'IL', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', true, true, true, false, true, 2, NOW()),
  ('reg_il_izmir', 'izmir', 'İzmir', 'IL', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80', true, true, true, false, true, 3, NOW())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Region" (
  "id", "slug", "name", "level", "image", "parentId", "active", "published",
  "showInSearch", "showInOffer", "showOnHome", "sortOrder", "updatedAt"
) VALUES
  ('reg_ilce_kas', 'kas', 'Kaş', 'ILCE', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', 'reg_il_antalya', true, true, true, false, false, 1, NOW()),
  ('reg_ilce_fethiye', 'fethiye-ilce', 'Fethiye', 'ILCE', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80', 'reg_il_mugla', true, true, true, false, false, 1, NOW()),
  ('reg_ilce_bodrum', 'bodrum-ilce', 'Bodrum', 'ILCE', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80', 'reg_il_mugla', true, true, true, false, false, 2, NOW()),
  ('reg_ilce_marmaris', 'marmaris', 'Marmaris', 'ILCE', 'https://images.unsplash.com/photo-1439066615861-d1af74c740f8?w=600&q=80', 'reg_il_mugla', true, true, true, false, false, 3, NOW()),
  ('reg_ilce_cesme', 'cesme-ilce', 'Çeşme', 'ILCE', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', 'reg_il_izmir', true, true, true, false, false, 1, NOW())
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Region" SET "level" = 'MAHALLE', "parentId" = 'reg_ilce_kas' WHERE "slug" = 'kalkan';
UPDATE "Region" SET "level" = 'MAHALLE', "parentId" = 'reg_ilce_fethiye' WHERE "slug" = 'fethiye';
UPDATE "Region" SET "level" = 'MAHALLE', "parentId" = 'reg_ilce_bodrum' WHERE "slug" = 'bodrum';
UPDATE "Region" SET "level" = 'MAHALLE', "parentId" = 'reg_ilce_cesme' WHERE "slug" = 'cesme';
UPDATE "Region" SET "level" = 'MAHALLE', "parentId" = 'reg_ilce_fethiye' WHERE "slug" = 'kayakoy';
UPDATE "Region" SET "level" = 'MAHALLE', "parentId" = 'reg_ilce_marmaris' WHERE "slug" = 'selimiye';

-- Remaining top-level rows without parent become MAHALLE until manually fixed
UPDATE "Region"
SET "level" = 'MAHALLE'
WHERE "parentId" IS NULL AND "level" = 'MAHALLE' AND "slug" NOT IN ('antalya', 'mugla', 'izmir', 'kas', 'fethiye-ilce', 'bodrum-ilce', 'marmaris', 'cesme-ilce');

UPDATE "Region"
SET "showOnHome" = true, "showInSearch" = true
WHERE "slug" IN ('kalkan', 'fethiye', 'bodrum', 'cesme', 'kayakoy', 'selimiye');
