-- CreateTable
CREATE TABLE "ChartAccountExport" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedBy" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ChartAccountExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChartAccountExport_kind_subjectId_key" ON "ChartAccountExport"("kind", "subjectId");

-- CreateIndex
CREATE INDEX "ChartAccountExport_kind_exportedAt_idx" ON "ChartAccountExport"("kind", "exportedAt");
