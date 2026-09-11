-- Tatil Asistanı: CompanySettings alanları
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "tatilAssistantEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "assistantWahaBaseUrl" TEXT NOT NULL DEFAULT 'http://localhost:3001';
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "assistantWahaApiKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "assistantWahaSessionName" TEXT NOT NULL DEFAULT 'tatil-asistani';
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "assistantWebhookSecret" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "assistantWelcomeMessage" TEXT NOT NULL DEFAULT '';

-- Tatil Asistanı tabloları
CREATE TABLE IF NOT EXISTS "TatilAssistantTopic" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TatilAssistantTopic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TatilAssistantExample" (
    "id" SERIAL NOT NULL,
    "topicId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TatilAssistantExample_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TatilAssistantRule" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TatilAssistantRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TatilAssistantConversation" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'web',
    "guestName" TEXT,
    "guestPhone" TEXT,
    "guestEmail" TEXT,
    "whatsappChatId" TEXT,
    "searchState" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TatilAssistantConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TatilAssistantMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TatilAssistantMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TatilAssistantTopic_active_sortOrder_idx" ON "TatilAssistantTopic"("active", "sortOrder");
CREATE INDEX IF NOT EXISTS "TatilAssistantExample_topicId_sortOrder_idx" ON "TatilAssistantExample"("topicId", "sortOrder");
CREATE INDEX IF NOT EXISTS "TatilAssistantRule_active_sortOrder_idx" ON "TatilAssistantRule"("active", "sortOrder");
CREATE INDEX IF NOT EXISTS "TatilAssistantConversation_channel_status_idx" ON "TatilAssistantConversation"("channel", "status");
CREATE INDEX IF NOT EXISTS "TatilAssistantConversation_whatsappChatId_idx" ON "TatilAssistantConversation"("whatsappChatId");
CREATE INDEX IF NOT EXISTS "TatilAssistantMessage_conversationId_createdAt_idx" ON "TatilAssistantMessage"("conversationId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "TatilAssistantExample" ADD CONSTRAINT "TatilAssistantExample_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TatilAssistantTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TatilAssistantMessage" ADD CONSTRAINT "TatilAssistantMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "TatilAssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
