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
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
          Acente Yönetimi
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Takvim WhatsApp
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          905436124151 numaralı hattı Evolution API ile bağlayın. Bu hat{" "}
          <strong>takvim otomasyonu</strong> ve{" "}
          <strong>misafir karşılayan</strong> (villa yetkilisi) bildirimleri
          içindir. Müşteri bildirimlerini gönderen Bildirim WhatsApp (WAHA)
          bağlantısından tamamen bağımsız çalışır.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-800">
            Port 8080
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
            Instance: {evolutionData.evolutionInstanceName}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
            Bağımsız WhatsApp hattı
          </span>
        </div>
      </header>

      <WhatsappEvolutionConnection
        evolutionBaseUrl={evolutionData.evolutionBaseUrl}
        evolutionApiKey={evolutionData.evolutionApiKey}
        evolutionInstanceName={evolutionData.evolutionInstanceName}
        webhookUrl={webhookUrl}
      />

      <WhatsappCalendarAutomation data={calendarData} webhookUrl={webhookUrl} />
    </div>
  );
}
