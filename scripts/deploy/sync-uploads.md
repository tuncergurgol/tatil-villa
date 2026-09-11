# Production `public/uploads` senkronu

## Neden gerekli?

- Uygulama villa/logo görsellerini **R2’ye yazmaz**; `public/uploads` altına kaydeder.
- DB’de çoğunlukla `/uploads/...` path’leri vardır.
- Bu klasör **Git’te yoktur** (`.gitignore`); deploy script’i de taşımaz.
- Yeni sunucuya sadece DB aktarıldıysa site görselleri **404** verir.

Cloudflare R2 bucket (`tatildeyiz`) eski CRM arşivi olabilir; `next.config.ts` uzak R2 host’larını okumaya izin verir. Yeni yüklemeler yine local diske gider.

## Boyut (referans)

Yerel `public/uploads` tipik olarak birkaç GB olabilir (`company/` + `villas/`).

## Teşhis özeti (2026-07-17)

| Kaynak | Durum |
|--------|--------|
| Logo `/uploads/company/...` | Production **404** (dosya sunucuda yok) |
| Villa kartları `/uploads/villas/...` | Production **404** (DB path local) |
| Kategori `https://r2.tatildeyiz.com.tr/...` | **200 OK** (R2 arşivi canlı) |

Sonuç: R2 eski medya için çalışıyor; asıl kırık olan **local uploads sync**.

## 0) SSH anahtarı (bir kez — Cursor/PC’den sync için)

Sunucudaki açık SSH oturumunda:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
grep -q 'cursor-deploy@tatildeyiz' ~/.ssh/authorized_keys 2>/dev/null || \
  echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAII1rf8xSB1ygA3bFStdx/qBCGfWez9lIgCdH7x9JpZbb cursor-deploy@tatildeyiz' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

PC’de anahtar: `%USERPROFILE%\.ssh\tatildeyiz_deploy` (+ `.pub`).

## Hızlı yol — sadece logo/company (~0.3 MB)

Sunucuda (script git’te `scripts/deploy/bootstrap-company-uploads.sh`):

```bash
cd /var/www/tatil-villa
git fetch origin
git reset --hard origin/cursor/booking-quick-filters-ui
bash scripts/deploy/bootstrap-company-uploads.sh
```

## PC → sunucu — villas (~2.7 GB, PowerShell)

Proje kökünden:

```powershell
.\scripts\deploy\sync-uploads.ps1 -Part company   # once logo (~kucuk)
.\scripts\deploy\sync-uploads.ps1 -Part villas    # ~2.7 GB, uzun surebilir
# veya hepsi:
.\scripts\deploy\sync-uploads.ps1
```

Veya manuel:

```powershell
# 1) Önce küçük company (logo vb.)
scp -i $env:USERPROFILE\.ssh\tatildeyiz_deploy -o IdentitiesOnly=yes -r ".\public\uploads\company" root@185.184.210.96:/var/www/tatil-villa/public/uploads/

# 2) Sonra villas (uzun sürebilir; SSH timeout olursa tekrar çalıştır)
scp -i $env:USERPROFILE\.ssh\tatildeyiz_deploy -o IdentitiesOnly=yes -r ".\public\uploads\villas" root@185.184.210.96:/var/www/tatil-villa/public/uploads/
```

`rsync` varsa (WSL/Git Bash):

```bash
rsync -avz --progress public/uploads/ root@185.184.210.96:/var/www/tatil-villa/public/uploads/
```

## Sunucuda doğrulama (SSH)

```bash
mkdir -p /var/www/tatil-villa/public/uploads
chmod -R a+rX /var/www/tatil-villa/public/uploads
ls /var/www/tatil-villa/public/uploads/company | head
ls /var/www/tatil-villa/public/uploads/villas | wc -l

curl -sI http://127.0.0.1:3000/uploads/company/logo-1783080885848.svg | head -5
# Beklenen: HTTP/1.1 200
```

Tarayıcı: `https://www.tatildeyiz.com.tr` — hard refresh. Hâlâ boşsa Cloudflare → Caching → **Purge Everything**.

## Deploy ile ilişki

`02-deploy-update.sh` içindeki `git reset --hard` genelde ignored `public/uploads` dosyalarını **silmez**. Yine de:

- `rm -rf public` veya temiz clone yapmayın
- Yeni sunucu kurulumunda bu senkronu **mutlaka** tekrarlayın
