-- AlterTable
ALTER TABLE "Villa" ADD COLUMN "facilityCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Amenity" ADD COLUMN "facilityCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "Amenity_facilityCategoryId_idx" ON "Amenity"("facilityCategoryId");

-- AddForeignKey
ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_facilityCategoryId_fkey" FOREIGN KEY ("facilityCategoryId") REFERENCES "FacilityCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
