-- CreateTable
CREATE TABLE "AmenityCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmenityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmenityCategory_slug_key" ON "AmenityCategory"("slug");

-- CreateIndex
CREATE INDEX "AmenityCategory_sortOrder_idx" ON "AmenityCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "AmenityCategory_active_idx" ON "AmenityCategory"("active");

-- CreateIndex
CREATE INDEX "Amenity_categoryId_idx" ON "Amenity"("categoryId");

-- CreateIndex
CREATE INDEX "Amenity_isDefault_idx" ON "Amenity"("isDefault");

-- CreateIndex
CREATE INDEX "Amenity_sortOrder_idx" ON "Amenity"("sortOrder");

-- CreateIndex
CREATE INDEX "Amenity_active_idx" ON "Amenity"("active");

-- AddForeignKey
ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AmenityCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
