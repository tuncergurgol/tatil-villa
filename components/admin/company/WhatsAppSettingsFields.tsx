export default function WhatsAppSettingsFields() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-sm text-emerald-900">
        <p className="font-semibold">Ücretsiz wa.me akışı</p>
        <p className="mt-2">
          WhatsApp bildirimleri Meta API üzerinden değil,{" "}
          <strong>wa.me</strong> bağlantısı ile çalışır. Rezervasyon ekranından
          ön ödeme bilgisi paylaşırken mesaj hazır açılır; son gönderimi
          WhatsApp uygulamanızda siz yaparsınız.
        </p>
        <p className="mt-2">API token veya ek kurulum gerekmez.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">Nasıl çalışır?</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>Rezervasyon düzenleme formunda Ön Ödeme Bilgisi Paylaş&apos;a tıklayın.</li>
          <li>Bildirim kanalı olarak WhatsApp&apos;ı işaretleyin.</li>
          <li>Gönder&apos;e bastığınızda müşteri numarasına hazır mesajla WhatsApp açılır.</li>
          <li>WhatsApp&apos;ta Gönder&apos;e basarak mesajı iletin.</li>
        </ol>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600">
        <p>
          Şirket WhatsApp iletişim numarası{" "}
          <strong>İletişim</strong> sekmesinden düzenlenir. wa.me bağlantısı
          müşteri telefon numarasına yönlendirir.
        </p>
      </div>
    </div>
  );
}
