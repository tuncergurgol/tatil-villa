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
3. **Rehber hub** — `/gezi-rehberi/{kalkan,kas,fethiye,…}` curated meta/H1/FAQ (markaya göre)
4. **Tema sayfaları** — `/tema/erken-rezervasyon`, `/tema/kis-tatili` + kategori konuları (balayı, ısıtmalı, deniz manzaralı, özel havuz)
5. **Sitemap** — `/sitemap.xml` içinde `/kategori/…`, `/gezi-rehberi/…`, `/tema/…`, `/blog/yazilar`
6. **Villa şema** — detayda `VacationRental` + `BreadcrumbList`
7. **LCP** — liste ilk kartında `priority` görsel
8. **Blog arşiv** — `/blog/yazilar` + “Tüm yazıları gör” CTA
9. **Stok envanteri** — `npx tsx scripts/report-seo-matrix-stock.ts` → `seo-matrix-stock.md`
10. **IndexNow** — `npx tsx scripts/ping-seo-discovery.ts` (öncelikli SEO URL’leri)

## GSC hijyeni

- Yalnızca yeni/düzeltilebilir sorunlarda “Düzeltmeyi doğrula”
- Intentional: noindex, robots, soft-404 (IndexNow), “Yönlendirmeli sayfa” → doğrulama başlatma
- Yeni matris URL’leri sitemap ile gelsin; ayrı property açma

## Stok kuralı

`SEO_MATRIX_MIN_STOCK = 3` (`lib/seo-matrix.ts`). Altında kategori `noindex`; sitemap’e girmez.
