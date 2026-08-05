# Cloudflare — Meta katalog feed bot allowlist

Meta Commerce Manager feed doğrulayıcısı (`facebookexternalhit`, `Facebot`, `facebookcatalog`) bazen Cloudflare bot korumasına takılır.

## Otomatik (API)

1. Cloudflare → **My Profile** → **API Tokens** → **Create Token**
2. Şablon: **Edit zone WAF** veya özel:
   - Zone / Zone / Read
   - Zone / WAF / Edit
   - Zone Resources: `tatildeyiz.com.tr`, `balayivillacisi.com`, `tatilvillacisi.com`
3. Sunucuda veya lokal:

```bash
export CLOUDFLARE_API_TOKEN="..."
bash scripts/deploy/05-cloudflare-feed-bot-allowlist.sh
```

Eklenen kurallar (her zone):

| Kural | Açıklama |
|-------|----------|
| WAF Skip | `/feeds/` + Meta user-agent → SBFM / managed / rate limit atlanır |
| Config | `/feeds/` → Security Level: Essentially Off, BIC kapalı |

**Not:** Ücretsiz plandaki **Bot Fight Mode** WAF skip ile tam kapatılamaz. Bu durumda Meta için **R2 URL** kullanın (admin panelde önerilen).

## Manuel (Dashboard)

Her zone için (tatildeyiz.com.tr, balayivillacisi.com, tatilvillacisi.com):

### Security → WAF → Custom rules → Create rule

- **Name:** `Meta catalog feed crawlers (/feeds/)`
- **Expression:**

```
(http.request.uri.path starts_with "/feeds/") and (http.user_agent contains "facebookexternalhit" or http.user_agent contains "Facebot" or http.user_agent contains "facebookcatalog" or http.user_agent contains "Meta-ExternalAgent")
```

- **Action:** Skip
- **Skip:** Super Bot Fight Mode, All managed rules, All rate limiting rules

### Rules → Configuration rules → Create rule

- **Name:** `Meta catalog feed low security (/feeds/)`
- **Expression:** `(http.request.uri.path starts_with "/feeds/")`
- **Settings:** Security Level = Essentially Off, Browser Integrity Check = Off

## Önerilen Meta URL (R2)

Bot korumasından bağımsız statik XML:

```
https://r2.tatildeyiz.com.tr/feeds/meta-catalog/tatil-villacisi.xml
https://r2.tatildeyiz.com.tr/feeds/meta-catalog/tatildeyiz.xml
https://r2.tatildeyiz.com.tr/feeds/meta-catalog/balayi-villacisi.xml
```

Saatte bir `scripts/warm-meta-catalog-feed.ts` ile güncellenir.
