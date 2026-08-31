# SEO / Analytics / Search Console — 3 site checklist

Geçiş sonrası Google’ın yeni altyapıyı tanıması birkaç hafta sürebilir. Geçiş tarihini not edin.

## Domainler

| Site | Canonical | robots | sitemap |
|------|-----------|--------|---------|
| Tatildeyiz | https://www.tatildeyiz.com.tr | /robots.txt | /sitemap.xml |
| Balayı Villacısı | https://www.balayivillacisi.com | /robots.txt | /sitemap.xml |
| Tatil Villacısı | https://www.tatilvillacisi.com | /robots.txt | /sitemap.xml |
| Site 4 (opsiyonel) | `PUBLIC_SITE_4_DOMAIN` | /robots.txt | /sitemap.xml |

## Bing Webmaster

1. https://www.bing.com/webmasters → site ekle (URL-prefix `https://www.…`)
2. HTML meta etiketi `content` değerini kopyala
3. Admin → Acente → Şirket → **Analytics & Scriptler** → ilgili site → Bing Webmaster alanına yapıştır
4. Sitemap: `https://www.{domain}/sitemap.xml`

## Yandex Webmaster

1. HTML doğrulama dosyaları `public/yandex_*.html` kökte yayında olabilir
2. Webmaster’da **Doğrula** → sitemap `/sitemap.xml` ekle
3. İsteğe bağlı: Analytics’teki Yandex Webmaster meta alanı

Admin paneli (`bont.tatildeyiz.com.tr`) indexlenmez (`Disallow: /admin`).

## 1. Kod tarafı (uygulama)

Admin → Acente → Şirket → **Analytics & Scriptler** sekmesinde her site için:

1. Google Analytics 4 ölçüm ID (`G-…`)
2. (Opsiyonel) GTM / Ads / Pixel / Clarity
3. Google Search Console HTML meta `content` değeri

Kaydettikten sonra public sayfalarda scriptler ve GSC meta otomatik yüklenir.

## 2. Google Search Console (her domain)

1. Mülk ekle: **URL-prefix** `https://www.…` (tercihen ayrıca Domain mülkü)
2. Doğrulama:
   - **Önerilen:** Cloudflare DNS TXT (`google-site-verification=…`) — sunucu/yazılım değişikliğinden etkilenmez
   - **Alternatif:** HTML meta (admin’e yapıştırılan kod)
3. Eski sitemap varsa kaldır; yeni sitemap gönder: `https://www.{domain}/sitemap.xml`
4. İlk 1–2 hafta **Sayfa dizine ekleme** raporunu günlük kontrol et (404 / 500)
5. **Güvenlik ve manuel işlemler** sekmesini kontrol et

## 3. HTTPS / protokol

- Cloudflare SSL: Full (strict) — origin cert sonrası
- HTTP → HTTPS nginx’te zorunlu
- Apex → www için Cloudflare Page Rule / Redirect Rule kullanın

## 4. Performans

- GSC → Önemli Web Verileri (LCP, INP, CLS) — mobil + masaüstü
- Mobil kullanılabilirlik / yeni tasarım kontrolü

## 5. Schema

Villa detay sayfalarında Google `VacationRental` JSON-LD üretilir (`containsPlace` → `Accommodation`, `identifier`, `latitude`/`longitude`, min. 8 görsel).  
GSC → Geliştirmeler → Kiralık yer raporunu izleyin; düzeltme sonrası **Düzeltmeyi doğrula** kullanın.

## 6. 301 / eski URL

Eski indeks URL’leri GSC 404 listesinden toplanıp `next.config` veya nginx 301 haritasına eklenebilir (ayrı iş).
