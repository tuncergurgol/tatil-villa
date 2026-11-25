import { headers } from "next/headers";
import TatilAssistantAdminPanel from "@/components/admin/tatil-assistant/TatilAssistantAdminPanel";
import { getTatilAssistantAdminData } from "@/lib/queries/tatil-assistant";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function TatilAsistaniAdminPage() {
  const data = await getTatilAssistantAdminData();
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const webhookUrl = `${protocol}://${host}/api/webhooks/whatsapp-assistant`;

  return (
    <TatilAssistantAdminPanel
      enabled={data.enabled}
      welcomeMessage={data.welcomeMessage}
      assistantWebhookSecret={data.assistantWebhookSecret}
      assistantWahaBaseUrl={data.assistantWahaBaseUrl}
      assistantWahaApiKey={data.assistantWahaApiKey}
      assistantWahaSessionName={data.assistantWahaSessionName}
      defaultPairingPhone={data.defaultPairingPhone}
      webhookUrl={webhookUrl}
      topics={data.topics}
      rules={data.rules}
      wahaQaItems={data.wahaQaItems.map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        occurrenceCount: item.occurrenceCount,
        sampleChatName: item.sampleChatName,
        lastSeenAt: item.lastSeenAt.toISOString(),
        importedExampleId: item.importedExampleId,
      }))}
    />
  );
}
