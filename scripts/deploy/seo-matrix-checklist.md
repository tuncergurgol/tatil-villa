# SEO matris / rehber — ölçüm checklist (4 site)

Uygulama sonrası her public sitede kontrol:

| Site | Origin |
|------|--------|
| Tatildeyiz | https://www.tatildeyiz.com.tr |
| Balayı Villacısı | https://www.balayivillacisi.com |
| Tatil Villacısı | https://www.tatilvillacisi.com |
| Glamping Turkey | https://www.glampingturkey.com |

## Faz doğrulama

1. **Bölge listesi SEO** — `/villalar?region=kalkan` altında metin + FAQ + breadcrumb JSON-LD
2. **Matris** — örn. `/kategori/kalkan-isitmali-havuzlu-villalar` (stok ≥ 3 ise index)
3. **Rehber hub** — `/gezi-rehberi/kalkan` CTA + kategori linkleri + örnek villalar
4. **Sitemap** — `/sitemap.xml` içinde `/kategori/…` ve `/gezi-rehberi/…` URL’leri
5. **Villa şema** — detayda `VacationRental` + `BreadcrumbList`
6. **LCP** — liste ilk kartında `priority` görsel

## GSC hijyeni

- Yalnızca yeni/düzeltilebilir sorunlarda “Düzeltmeyi doğrula”
- Intentional: noindex, robots, soft-404 (IndexNow), “Yönlendirmeli sayfa” → doğrulama başlatma
- Yeni matris URL’leri sitemap ile gelsin; ayrı property açma

## Stok kuralı

`SEO_MATRIX_MIN_STOCK = 3` (`lib/seo-matrix.ts`). Altında kategori `noindex`; sitemap’e girmez.
