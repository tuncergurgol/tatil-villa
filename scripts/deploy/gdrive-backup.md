# Google Drive gece yedekleri (rclone)

Her gece **04:30** (Europe/Istanbul) sunucu:

1. **SQL** → `tatildeyiz-yedek/sql/` (Postgres custom dump)
2. **Site dosyaları** → `tatildeyiz-yedek/dosyalar/` (tar.gz; `node_modules` / `.next` hariç)

## İlk kurulum

```bash
# sunucuda
cd /var/www/tatil-villa
bash scripts/deploy/08-setup-gdrive-backup.sh
```

Google hesabı yetkisi yoksa script durur. Token üretmek için bilgisayarınızda:

```bash
winget install Rclone.Rclone
rclone authorize "drive"
```

Çıkan JSON'u sunucuya verin:

```bash
RCLONE_DRIVE_TOKEN='{"access_token":"...","token_type":"Bearer",...}' \
  bash scripts/deploy/08-setup-gdrive-backup.sh
```

İlk yedek:

```bash
bash scripts/deploy/backup-to-gdrive.sh
```

## Cron

`04-setup-cron.sh` satırı:

`30 4 * * * ... backup-to-gdrive.sh`

Log: `/var/log/tatil-villa-cron/gdrive-backup.log`

Yerel kopya: `/var/backups/tatil-villa/{sql,files}/` (14 gün saklanır)
