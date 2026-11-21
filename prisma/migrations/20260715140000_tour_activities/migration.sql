-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "sourceId" INTEGER,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDesc" TEXT NOT NULL DEFAULT '',
    "overview" TEXT NOT NULL DEFAULT '',
    "descriptionHtml" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "durationHours" TEXT NOT NULL DEFAULT '',
    "groupSize" TEXT NOT NULL DEFAULT '',
    "tag" TEXT NOT NULL DEFAULT '',
    "priceFrom" DOUBLE PRECISION,
    "currency" "VillaPeriodCurrency" NOT NULL DEFAULT 'TL',
    "hasTransfer" BOOLEAN NOT NULL DEFAULT false,
    "freeCancelationHours" TEXT NOT NULL DEFAULT '',
    "includesJson" TEXT NOT NULL DEFAULT '[]',
    "highlightsJson" TEXT NOT NULL DEFAULT '[]',
    "excludesJson" TEXT NOT NULL DEFAULT '[]',
    "coverImage" TEXT NOT NULL DEFAULT '',
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "seoKeywords" TEXT NOT NULL DEFAULT '',
    "canonicalPath" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onList" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourImage" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");

-- CreateIndex
CREATE INDEX "Tour_isActive_idx" ON "Tour"("isActive");

-- CreateIndex
CREATE INDEX "Tour_onList_idx" ON "Tour"("onList");

-- CreateIndex
CREATE INDEX "Tour_sortOrder_idx" ON "Tour"("sortOrder");

-- CreateIndex
CREATE INDEX "Tour_sourceId_idx" ON "Tour"("sourceId");

-- CreateIndex
CREATE INDEX "Tour_tag_idx" ON "Tour"("tag");

-- CreateIndex
CREATE INDEX "TourImage_tourId_idx" ON "TourImage"("tourId");

-- CreateIndex
CREATE INDEX "TourImage_sortOrder_idx" ON "TourImage"("sortOrder");

-- CreateIndex
CREATE INDEX "TourImage_isMain_idx" ON "TourImage"("isMain");

-- AddForeignKey
ALTER TABLE "TourImage" ADD CONSTRAINT "TourImage_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
