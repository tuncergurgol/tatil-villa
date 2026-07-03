-- CreateTable
CREATE TABLE "FacilityCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tag" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "longDescription" TEXT NOT NULL DEFAULT '',
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "seoKeywords" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "showInSearch" BOOLEAN NOT NULL DEFAULT false,
    "showInOffer" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacilityCategory_slug_key" ON "FacilityCategory"("slug");

-- CreateIndex
CREATE INDEX "FacilityCategory_sortOrder_idx" ON "FacilityCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "FacilityCategory_published_idx" ON "FacilityCategory"("published");

-- CreateIndex
CREATE INDEX "FacilityCategory_showInSearch_idx" ON "FacilityCategory"("showInSearch");

-- CreateIndex
CREATE INDEX "FacilityCategory_showInOffer_idx" ON "FacilityCategory"("showInOffer");
