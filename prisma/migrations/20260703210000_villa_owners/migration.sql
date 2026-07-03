-- CreateTable
CREATE TABLE "VillaOwner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillaOwner_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Villa" ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VillaOwner_userId_key" ON "VillaOwner"("userId");

-- CreateIndex
CREATE INDEX "VillaOwner_active_idx" ON "VillaOwner"("active");

-- CreateIndex
CREATE INDEX "Villa_ownerId_idx" ON "Villa"("ownerId");

-- AddForeignKey
ALTER TABLE "VillaOwner" ADD CONSTRAINT "VillaOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Villa" ADD CONSTRAINT "Villa_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "VillaOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
