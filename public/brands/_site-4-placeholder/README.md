# Site 4 marka görselleri

Domain ve `PUBLIC_SITE_4_KEY` belli olunca bu klasörü `{key}` olarak yeniden adlandırın
veya `public/brands/{key}/` altında şu dosyaları ekleyin:

- `logo.png`
- `favicon.png`
- `og-image.png`
- `hero.png`

Ardından production `.env` içine `PUBLIC_SITE_4_*` değişkenlerini yazıp nginx + Cloudflare DNS
kayıtlarını `scripts/deploy/cloudflare-dns.txt` notlarına göre tamamlayın.
