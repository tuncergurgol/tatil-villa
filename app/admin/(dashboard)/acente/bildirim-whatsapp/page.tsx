import WhatsappWahaConnection from "@/components/admin/agency/WhatsappWahaConnection";
import { getWahaWhatsappAdminData } from "@/lib/queries/waha-whatsapp";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function BildirimWhatsappPage() {
  const wahaData = await getWahaWhatsappAdminData();
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  const webhookUrl = `${baseUrl}/api/webhooks/whatsapp-calendar`;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Acente Yönetimi
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Bildirim WhatsApp
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          WAHA API ile müşteri bildirim WhatsApp oturumunu oluşturun ve bağlayın.
          Ön ödeme, konfirme, giriş bilgisi (misafir), OTP ve yeni rezervasyon
          talebi mesajları bu hattan gider. Takvim ve misafir karşılayan
          mesajları Evolution&apos;da kalır.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
            Port 3001
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
            Oturum: {wahaData.wahaSessionName}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
            WAHA
          </span>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Kurulum özeti</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              waha/
            </code>{" "}
            klasöründe{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              docker compose up -d
            </code>
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              waha/.env
            </code>{" "}
            içindeki <strong>WAHA_API_KEY</strong> değerini aşağıya yapıştırın
          </li>
          <li>Ayarları kaydedin → QR ile bağlanın</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Dashboard:{" "}
          <a
            href="http://localhost:3001/dashboard"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-emerald-700 underline"
          >
            http://localhost:3001/dashboard
          </a>
        </p>
      </div>

      <WhatsappWahaConnection
        wahaBaseUrl={wahaData.wahaBaseUrl}
        wahaApiKey={wahaData.wahaApiKey}
        wahaSessionName={wahaData.wahaSessionName}
        webhookUrl={webhookUrl}
      />
    </div>
  );
}
