-- CreateTable
CREATE TABLE "CmsContentTab" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL DEFAULT 'custom',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsContentTab_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CmsContentTab_key_key" ON "CmsContentTab"("key");

-- CreateIndex
CREATE INDEX "CmsContentTab_sortOrder_idx" ON "CmsContentTab"("sortOrder");

-- CreateIndex
CREATE INDEX "CmsContentTab_active_idx" ON "CmsContentTab"("active");

-- Seed default content tabs
INSERT INTO "CmsContentTab" ("id", "key", "name", "moduleKey", "sortOrder", "active", "createdAt", "updatedAt")
VALUES
  ('cmstab_sss_default', 'sss', 'Sık Sorulan Sorular', 'sss', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmstab_blog_default', 'blog', 'Blog', 'blog', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmstab_yorumlar_default', 'yorumlar', 'Misafir Yorumları', 'yorumlar', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmstab_kurumsal_default', 'kurumsal', 'Kurumsal', 'kurumsal', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmstab_menuler_default', 'menuler', 'Menüler', 'menuler', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmstab_kampanyalar_default', 'kampanyalar', 'Kampanyalar', 'kampanyalar', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
