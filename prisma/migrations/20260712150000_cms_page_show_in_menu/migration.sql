-- AlterTable
ALTER TABLE "CmsPage" ADD COLUMN "showInMenu" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CmsPage_showInMenu_idx" ON "CmsPage"("showInMenu");

-- Mevcut kurumsal sol menü sayfalarını görünür yap
UPDATE "CmsPage"
SET "showInMenu" = true
WHERE "slug" IN (
  'hakkimizda',
  'iletisim',
  'banka-bilgilerimiz',
  'online-rezervasyon-sozlesmesi',
  'iptal-ve-iade-kosullari',
  'gizlilik-politikasi'
);
