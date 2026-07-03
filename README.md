# Tatil Villa — Villa Kiralama Sitesi

PostgreSQL + Prisma ile villa kiralama, rezervasyon ve admin paneli.

## Gereksinimler

- Node.js 20+
- Docker Desktop (yerel PostgreSQL için)

## Kurulum

```bash
cd tatil-villa
npm install

# PostgreSQL başlat
docker compose up -d

# Veritabanı şeması ve seed
npx prisma migrate dev --name init
npm run db:seed

# Geliştirme sunucusu
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin/login
  - E-posta: `admin@tatildeyiz.com.tr`
  - Şifre: `admin123`

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run db:up` | PostgreSQL container başlat |
| `npm run db:down` | PostgreSQL container durdur |
| `npm run db:migrate` | Migration çalıştır |
| `npm run db:seed` | Örnek veriyi yükle |
| `npm run db:studio` | Prisma Studio aç |

## Özellikler

- Villa / bungalov listeleme ve filtreleme
- Tarih ve misafir bazlı müsaitlik kontrolü
- Rezervasyon talebi oluşturma
- Admin paneli: villa, bölge, kampanya CRUD
- Rezervasyon onaylama / iptal

## Ortam Değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın:

```
DATABASE_URL="postgresql://tatil:tatil_dev@localhost:5432/tatil_villa"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
ADMIN_EMAIL="admin@tatildeyiz.com.tr"
ADMIN_PASSWORD="admin123"
```

## Teknolojiler

- Next.js 16, React 19, Tailwind CSS 4
- PostgreSQL 16, Prisma ORM
- NextAuth.js (admin girişi)
- Zod (form doğrulama)
