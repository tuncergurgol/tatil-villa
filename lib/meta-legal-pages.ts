import "server-only";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function legalPageShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="robots" content="index,follow" />
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 48rem; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.125rem; margin-top: 1.75rem; }
    p, li { font-size: 1rem; }
    ul { padding-left: 1.25rem; }
    a { color: #0d9488; }
    .meta { color: #555; font-size: 0.95rem; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function buildMetaPrivacyPolicyHtml(): Promise<string> {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

  const brand = site.brandName || company.brandName;
  const companyTitle = company.companyTitle || company.agencyName;
  const email = company.email || "info@tatilvillacisi.com.tr";
  const domain = site.domain || company.domain;

  const body = `
  <h1>Gizlilik Politikası</h1>
  <p class="meta">${escapeHtml(companyTitle)} — ${escapeHtml(brand)} (${escapeHtml(domain)})</p>
  <p>
    Bu gizlilik politikası, ${escapeHtml(brand)} web sitesi ve Facebook/Instagram reklam formları
    (Lead Ads) aracılığıyla toplanan kişisel verilerin nasıl işlendiğini açıklar.
  </p>

  <h2>Toplanan veriler</h2>
  <ul>
    <li>Ad, soyad</li>
    <li>E-posta adresi</li>
    <li>Telefon numarası</li>
    <li>Reklam formunda doldurduğunuz diğer bilgiler (tarih, kişi sayısı vb.)</li>
    <li>Facebook/Instagram reklam etkileşim bilgileri (form, kampanya, reklam kimliği)</li>
  </ul>

  <h2>Verilerin kullanım amacı</h2>
  <p>
    Toplanan veriler; villa kiralama talebinize dönüş yapmak, rezervasyon sürecini yürütmek,
    müşteri hizmetleri sağlamak ve yasal yükümlülüklerimizi yerine getirmek amacıyla işlenir.
    Facebook Lead Ads formlarından gelen veriler yalnızca talebinize ilişkin iletişim ve
    rezervasyon süreçlerinde kullanılır.
  </p>

  <h2>Verilerin paylaşımı</h2>
  <p>
    Kişisel verileriniz; yasal zorunluluklar, ödeme/rezervasyon hizmet sağlayıcıları ve
    teknik altyapı hizmetleri dışında üçüncü taraflarla pazarlama amacıyla satılmaz veya
    paylaşılmaz.
  </p>

  <h2>Veri saklama süresi</h2>
  <p>
    Verileriniz, işleme amacının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen
    zamanaşımı süreleri kadar saklanır; süre sonunda silinir, yok edilir veya anonim hale getirilir.
  </p>

  <h2>Verilerin silinmesini talep etme</h2>
  <p id="veri-silme">
    KVKK kapsamındaki haklarınızı kullanabilir ve kişisel verilerinizin silinmesini talep edebilirsiniz.
    Silme talebi için aşağıdaki yöntemlerden birini kullanın:
  </p>
  <ul>
    <li>E-posta: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></li>
    <li>Veri silme sayfamız: <a href="https://${escapeHtml(domain)}/meta/veri-silme">https://${escapeHtml(domain)}/meta/veri-silme</a></li>
    <li>İletişim formu: <a href="https://${escapeHtml(domain)}/kurumsal/iletisim">https://${escapeHtml(domain)}/kurumsal/iletisim</a></li>
  </ul>
  <p>
    Talebiniz en geç 30 gün içinde değerlendirilir; kimlik doğrulaması gerekebilir.
    Facebook/Instagram reklam formu üzerinden paylaştığınız veriler de bu talep kapsamında silinir.
  </p>

  <h2>İletişim</h2>
  <p>
    ${escapeHtml(companyTitle)}<br />
    ${escapeHtml(company.address || "")}<br />
    E-posta: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
  </p>
  <p><small>Son güncelleme: Ağustos 2026</small></p>`;

  return legalPageShell("Gizlilik Politikası", body);
}

export async function buildMetaDataDeletionHtml(): Promise<string> {
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);

  const brand = site.brandName || company.brandName;
  const companyTitle = company.companyTitle || company.agencyName;
  const email = company.email || "info@tatilvillacisi.com.tr";
  const domain = site.domain || company.domain;

  const body = `
  <h1>Kullanıcı Verisi Silme Talebi</h1>
  <p class="meta">${escapeHtml(companyTitle)} — ${escapeHtml(brand)}</p>
  <p>
    Facebook veya Instagram reklam formları (Lead Ads) aracılığıyla paylaştığınız kişisel
    verilerin silinmesini talep edebilirsiniz.
  </p>

  <h2>Nasıl talep edilir?</h2>
  <ol>
    <li>
      <strong>${escapeHtml(email)}</strong> adresine e-posta gönderin.
    </li>
    <li>Konu satırına <strong>Veri Silme Talebi</strong> yazın.</li>
    <li>
      Mesajınızda ad-soyadınızı ve reklam formunda kullandığınız e-posta veya telefon
      numarasını belirtin.
    </li>
  </ol>
  <p>
    Alternatif olarak
    <a href="https://${escapeHtml(domain)}/kurumsal/iletisim">iletişim sayfamız</a>
    üzerinden de başvurabilirsiniz.
  </p>

  <h2>İşlem süresi</h2>
  <p>
    Talebiniz kimlik doğrulaması sonrası en geç 30 gün içinde sonuçlandırılır.
    Silme işlemi tamamlandığında e-posta ile bilgilendirilirsiniz.
  </p>

  <h2>Gizlilik politikası</h2>
  <p>
    Detaylı bilgi için
    <a href="https://${escapeHtml(domain)}/meta/gizlilik-politikasi">gizlilik politikamıza</a>
    bakabilirsiniz.
  </p>`;

  return legalPageShell("Kullanıcı Verisi Silme Talebi", body);
}
