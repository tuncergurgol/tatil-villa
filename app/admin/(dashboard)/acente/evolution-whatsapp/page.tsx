import WhatsappEvolutionConnection from "@/components/admin/agency/WhatsappEvolutionConnection";
import WhatsappCalendarAutomation from "@/components/admin/agency/WhatsappCalendarAutomation";
import { getEvolutionWhatsappAdminData } from "@/lib/queries/evolution-whatsapp";
import { getWhatsappCalendarAdminData } from "@/lib/queries/whatsapp-calendar";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function EvolutionWhatsappPage() {
  const [evolutionData, calendarData] = await Promise.all([
    getEvolutionWhatsappAdminData(),
    getWhatsappCalendarAdminData(),
  ]);
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  const webhookUrl = `${baseUrl}/api/webhooks/whatsapp-calendar`;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Takvim WhatsApp Otomasyonu
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          905436124151 numaralı bağımsız WhatsApp hattındaki grup mesajlarını
          anlık dinler, villayla eşleştirir ve algılanan tarihlere göre takvimi
          otomatik günceller.
        </p>
      </header>

      <WhatsappCalendarAutomation
        data={calendarData}
        webhookUrl={webhookUrl}
        connectionPanel={
          <WhatsappEvolutionConnection
            evolutionBaseUrl={evolutionData.evolutionBaseUrl}
            evolutionApiKey={evolutionData.evolutionApiKey}
            evolutionInstanceName={evolutionData.evolutionInstanceName}
            webhookUrl={webhookUrl}
            embedded
          />
        }
      />
    </div>
  );
}
