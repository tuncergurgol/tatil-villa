-- CMS content tables
CREATE TYPE "CmsPageType" AS ENUM ('CORPORATE', 'LEGAL', 'LANDING');

CREATE TABLE IF NOT EXISTS "CmsPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "excerpt" TEXT NOT NULL DEFAULT '',
  "pageType" "CmsPageType" NOT NULL DEFAULT 'CORPORATE',
  "seoTitle" TEXT NOT NULL DEFAULT '',
  "seoDescription" TEXT NOT NULL DEFAULT '',
  "seoKeywords" TEXT NOT NULL DEFAULT '',
  "published" BOOLEAN NOT NULL DEFAULT false,
  "showInFooter" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CmsPage_slug_key" ON "CmsPage"("slug");
CREATE INDEX IF NOT EXISTS "CmsPage_published_idx" ON "CmsPage"("published");
CREATE INDEX IF NOT EXISTS "CmsPage_pageType_idx" ON "CmsPage"("pageType");
CREATE INDEX IF NOT EXISTS "CmsPage_sortOrder_idx" ON "CmsPage"("sortOrder");

CREATE TABLE IF NOT EXISTS "FaqItem" (
  "id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'genel',
  "slug" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FaqItem_slug_key" ON "FaqItem"("slug");
CREATE INDEX IF NOT EXISTS "FaqItem_active_category_idx" ON "FaqItem"("active", "category");
CREATE INDEX IF NOT EXISTS "FaqItem_sortOrder_idx" ON "FaqItem"("sortOrder");

CREATE TABLE IF NOT EXISTS "BlogCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "seoTitle" TEXT NOT NULL DEFAULT '',
  "seoDescription" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogCategory_slug_key" ON "BlogCategory"("slug");
CREATE INDEX IF NOT EXISTS "BlogCategory_active_sortOrder_idx" ON "BlogCategory"("active", "sortOrder");

CREATE TABLE IF NOT EXISTS "BlogPost" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL DEFAULT '',
  "content" TEXT NOT NULL DEFAULT '',
  "coverImage" TEXT NOT NULL DEFAULT '',
  "authorName" TEXT NOT NULL DEFAULT 'Tatildeyiz',
  "seoTitle" TEXT NOT NULL DEFAULT '',
  "seoDescription" TEXT NOT NULL DEFAULT '',
  "seoKeywords" TEXT NOT NULL DEFAULT '',
  "published" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX IF NOT EXISTS "BlogPost_published_publishedAt_idx" ON "BlogPost"("published", "publishedAt");
CREATE INDEX IF NOT EXISTS "BlogPost_categoryId_idx" ON "BlogPost"("categoryId");

CREATE TABLE IF NOT EXISTS "GuestReview" (
  "id" TEXT NOT NULL,
  "guestName" TEXT NOT NULL,
  "guestCity" TEXT NOT NULL DEFAULT '',
  "rating" INTEGER NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "comment" TEXT NOT NULL,
  "villaId" TEXT,
  "stayMonth" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GuestReview_approved_featured_idx" ON "GuestReview"("approved", "featured");
CREATE INDEX IF NOT EXISTS "GuestReview_villaId_idx" ON "GuestReview"("villaId");
CREATE INDEX IF NOT EXISTS "GuestReview_rating_idx" ON "GuestReview"("rating");

CREATE TABLE IF NOT EXISTS "SiteMenu" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteMenu_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SiteMenu_key_key" ON "SiteMenu"("key");

CREATE TABLE IF NOT EXISTS "SiteMenuItem" (
  "id" TEXT NOT NULL,
  "menuId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteMenuItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SiteMenuItem_menuId_sortOrder_idx" ON "SiteMenuItem"("menuId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SiteMenuItem_parentId_idx" ON "SiteMenuItem"("parentId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlogPost_categoryId_fkey') THEN
    ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuestReview_villaId_fkey') THEN
    ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_villaId_fkey" FOREIGN KEY ("villaId") REFERENCES "Villa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SiteMenuItem_menuId_fkey') THEN
    ALTER TABLE "SiteMenuItem" ADD CONSTRAINT "SiteMenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "SiteMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SiteMenuItem_parentId_fkey') THEN
    ALTER TABLE "SiteMenuItem" ADD CONSTRAINT "SiteMenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SiteMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
