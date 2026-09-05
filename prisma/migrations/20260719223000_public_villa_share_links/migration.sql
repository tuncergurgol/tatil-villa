CREATE TABLE "PublicVillaShareLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "villaIds" TEXT[] NOT NULL,
    "checkIn" TEXT NOT NULL,
    "checkOut" TEXT NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicVillaShareLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicVillaShareLink_code_key"
ON "PublicVillaShareLink"("code");

CREATE INDEX "PublicVillaShareLink_createdAt_idx"
ON "PublicVillaShareLink"("createdAt");
