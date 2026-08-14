# Facebook Lead Ads — Bont kurulum

Admin: **Pazarlama → Facebook Lead** (`/admin/pazarlama/facebook-lead`)

## 1. Panelde bağlantı

1. **Facebook bağlantısı** sekmesine gidin
2. **Facebook Lead entegrasyonu aktif** işaretleyin
3. Meta App ID, App Secret, Page ID, Page Access Token girin
4. **Webhook URL** ve **Verify Token** değerlerini kopyalayın
5. Kaydedin

Webhook URL:
```
https://bont.tatildeyiz.com.tr/api/webhooks/facebook-leads
```

## 2. Meta Developers

1. [developers.facebook.com](https://developers.facebook.com) → Uygulama
2. **Webhooks** → **Page** → Subscribe
3. Callback URL + Verify Token (panelden)
4. **leadgen** alanına abone olun
5. Page Access Token: `leads_retrieval`, `pages_manage_metadata`, `pages_read_engagement`

## 3. Lead Ads formu

1. Meta Ads Manager → Kampanya → **Lead generation**
2. Instant Form oluşturun (ad, telefon, e-posta, özel sorular)
3. Formu sayfanıza bağlayın

Yeni lead geldiğinde:
- Webhook tetiklenir
- Graph API ile form alanları çekilir
- Bont’ta listelenir
- E-posta + WhatsApp bildirimi gider (operasyon hattı)

## 4. Takip akışı (panel)

- **Durum:** Yeni → İletişim kuruldu → Nitelikli → Dönüştü / Kayıp
- **İletişim kaydı:** Telefon, WhatsApp, e-posta, not
- **Takip tarihi:** Hatırlatma için `nextFollowUpAt`
- **Manuel lead:** Organik DM / telefon lead’leri elle eklenebilir

## Test

Panelde **Test lead oluştur** ile örnek kayıt ekleyin.
