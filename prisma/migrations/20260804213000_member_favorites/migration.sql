-- CreateEnum
CREATE TYPE "MemberFavoriteItemType" AS ENUM ('VILLA');

-- CreateTable
CREATE TABLE "MemberFavorite" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "itemType" "MemberFavoriteItemType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberFavorite_memberId_idx" ON "MemberFavorite"("memberId");

-- CreateIndex
CREATE INDEX "MemberFavorite_itemType_itemId_idx" ON "MemberFavorite"("itemType", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberFavorite_memberId_itemType_itemId_key" ON "MemberFavorite"("memberId", "itemType", "itemId");

-- AddForeignKey
ALTER TABLE "MemberFavorite" ADD CONSTRAINT "MemberFavorite_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MemberAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
