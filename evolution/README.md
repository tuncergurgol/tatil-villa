# Evolution API (Tatil Villa)

WhatsApp bağlantısı için Evolution API köprüsü. Admin panelde **Evolution WhatsApp** sayfasından QR veya telefon numarası ile bağlanın.

## Kurulum (Windows)

```powershell
cd evolution
.\setup.ps1
```

## Manuel

```powershell
cd evolution
docker compose up -d
```

- API: http://localhost:8080
- Manager: http://localhost:8080/manager
- API anahtarı: `.env` içindeki `AUTHENTICATION_API_KEY`

## Admin panel

1. **Acente Yönetimi → Evolution WhatsApp**
2. Sunucu adresi: `http://localhost:8080`
3. API anahtarını `.env` dosyasından yapıştırın
4. Örnek instance adı: `tatil-villa`
5. **QR ile Bağlan** veya **Telefon Numarası ile Bağlan**

## Notlar

- Takvim WhatsApp otomasyonu aynı mantıkla çalışmaya devam eder.
- Evolution bağlantısı üzerinden gelen grup mesajları takvim webhookuna aktarılır.
- Loglar: `docker compose logs -f evolution-api`
