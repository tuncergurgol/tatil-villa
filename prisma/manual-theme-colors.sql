-- CompanySettings: 4 renkli tema paleti
ALTER TABLE "CompanySettings"
  ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT '#14b8a6',
  ADD COLUMN IF NOT EXISTS "surfaceColor" TEXT NOT NULL DEFAULT '#f0fdfa';
