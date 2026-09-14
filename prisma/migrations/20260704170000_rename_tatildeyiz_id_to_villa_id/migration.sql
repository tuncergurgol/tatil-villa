-- AlterTable
ALTER TABLE "Villa" RENAME COLUMN "tatildeyizId" TO "villaId";

-- RenameIndex
ALTER INDEX "Villa_tatildeyizId_key" RENAME TO "Villa_villaId_key";
