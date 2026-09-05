-- AlterTable
ALTER TABLE "Villa" ADD COLUMN "tatildeyizId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Villa_tatildeyizId_key" ON "Villa"("tatildeyizId");
