export default function WhatsAppSettingsFields() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-sm text-emerald-900">
        <p className="font-semibold">Sistem WhatsApp (Evolution API)</p>
        <p className="mt-2">
          Ön ödeme bilgisi paylaşımındaki WhatsApp bildirimleri, kişisel
          WhatsApp uygulaması yerine{" "}
          <strong>Sistem WhatsApp (Evolution API)</strong> üzerinden otomatik
          gönderilir.
        </p>
        <p className="mt-2">
          Bağlantı ve API ayarları{" "}
          <strong>Acente → Evolution WhatsApp</strong> sayfasından yönetilir.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">Nasıl çalışır?</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            Rezervasyon düzenleme formunda Ön Ödeme Bilgisi Paylaş&apos;a
            tıklayın.
          </li>
          <li>Bildirim kanalı olarak WhatsApp&apos;ı işaretleyin.</li>
          <li>
            Gönder&apos;e bastığınızda mesaj müşteri numarasına Sistem WhatsApp
            üzerinden iletilir.
          </li>
        </ol>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600">
        <p>
          Şirket WhatsApp iletişim numarası{" "}
          <strong>İletişim</strong> sekmesinden düzenlenir. Otomatik gönderim
          için Evolution instance&apos;ının bağlı olması gerekir.
        </p>
      </div>
    </div>
  );
}
