-- CreateTable
CREATE TABLE "SurroundingCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurroundingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurroundingLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurroundingLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurroundingCategory_slug_key" ON "SurroundingCategory"("slug");

-- CreateIndex
CREATE INDEX "SurroundingCategory_sortOrder_idx" ON "SurroundingCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "SurroundingCategory_active_idx" ON "SurroundingCategory"("active");

-- CreateIndex
CREATE INDEX "SurroundingLocation_categoryId_idx" ON "SurroundingLocation"("categoryId");

-- CreateIndex
CREATE INDEX "SurroundingLocation_sortOrder_idx" ON "SurroundingLocation"("sortOrder");

-- CreateIndex
CREATE INDEX "SurroundingLocation_active_idx" ON "SurroundingLocation"("active");

-- AddForeignKey
ALTER TABLE "SurroundingLocation" ADD CONSTRAINT "SurroundingLocation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SurroundingCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
