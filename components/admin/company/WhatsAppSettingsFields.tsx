export default function WhatsAppSettingsFields() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 text-sm text-emerald-900">
        <p className="font-semibold">Bildirim WhatsApp (WAHA)</p>
        <p className="mt-2">
          Müşteriye giden WhatsApp bildirimleri (ön ödeme, konfirme, giriş
          bilgisi, OTP, yeni rezervasyon talebi){" "}
          <strong>Bildirim WhatsApp (WAHA)</strong> üzerinden gönderilir.
        </p>
        <p className="mt-2">
          Bağlantı ve API ayarları{" "}
          <strong>Acente → Bildirim WhatsApp</strong> sayfasından yönetilir.
        </p>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-4 text-sm text-violet-900">
        <p className="font-semibold">Evolution WhatsApp</p>
        <p className="mt-2">
          Takvim otomasyonu ve misafir karşılayan (villa yetkilisi)
          bilgilendirmeleri <strong>Evolution WhatsApp</strong> hattında kalır.
        </p>
        <p className="mt-2">
          Ayarlar <strong>Acente → Evolution WhatsApp</strong> sayfasındadır.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-5 py-4 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">Nasıl çalışır?</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            Rezervasyon formunda Ön Ödeme / Konfirme / Giriş Bilgisi
            paylaşımında WhatsApp kanalını işaretleyin.
          </li>
          <li>
            Müşteri mesajları Bildirim WhatsApp (WAHA) üzerinden iletilir.
          </li>
          <li>
            Villa yetkilisi (karşılayan) mesajları Evolution üzerinden iletilir.
          </li>
        </ol>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600">
        <p>
          Şirket WhatsApp iletişim numarası <strong>İletişim</strong>{" "}
          sekmesinden düzenlenir. Otomatik müşteri gönderimi için WAHA
          oturumunun bağlı olması gerekir.
        </p>
      </div>
    </div>
  );
}
