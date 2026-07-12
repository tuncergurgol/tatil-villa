const { PrismaClient } = require("@prisma/client");

const GUEST_SMS = `Sayın ##MUSTERIADI##, ##TESISADI## için oluşturduğunuz rezervasyon talebiniz alınmıştır.`;

const GUEST_WHATSAPP = `Sayın
##MUSTERIADI##,
##TESISADI## için oluşturduğunuz rezervasyon talebiniz alınmıştır.

##FIRMAADI##`;

const GUEST_MAIL = `##SITELOGO##

Sayın ##MUSTERIADI##,

##VILLAADI## (##VILLABOLGE##) için ##GIRISTARIHI## ##GIRISGUNU## ve ##CIKISTARIHI## ##CIKISGUNU## tarihlerini kapsayan rezervasyon talebiniz bize ulaşmıştır.

En kısa sürede müşteri temsilcimiz sizinle; telefon, e-mail ya da WhatsApp yoluyla iletişime geçecektir.

Teşekkür ederiz.
##SITEADI##

Rezervasyon Bilgileri

İletişim Bilgileri
Ad Soyad:	##MUSTERIADI##
Email:	##MUSTERIMAIL##
Telefon:	##MUSTERITELEFON##

Misafir Bilgileri
Yetişkin:	##YETISKIN##
Çocuk:	##COCUK##
Bebek:	##BEBEK##
Pets:	##EVCILHAYVAN##

Tatil Bilgileri
Giriş Tarihi:	##GIRISTARIHI## ##GIRISGUNU##
Giriş Saati:	##VILLACHECKIN##
Çıkış Tarihi:	##CIKISTARIHI## ##CIKISGUNU##
Çıkış Saati:	##VILLACHECKOUT##
Konaklama:	##GUNSAYISI## Gece

Ödeme Bilgileri
Konaklama Bedeli :	##GROSSPRICE## TL
Temizlik Bedeli :	##CLEANINGFEE## TL
Evcil Hayvan Temizlik Bedeli :	##PETCLEANINGFEE## TL
Ek Yatak Bedeli :	##EXTRAACCOMMODATIONFEE## TL
Yerden Isıtma :	##UNDERFLOORHEATINGFEE## TL
Havuz Isıtma (Özel Havuz) :	##POOLHEATINGPRIVATEFEE## TL
Havuz Isıtma (Kapalı Havuz) :	##POOLHEATINGINDOORFEE## TL
Toplam Tutar:	##TOPLAMTUTAR## TL
Ön Ödeme Tutarı:	##ONODEME## TL
Ön Ödeme Türü:	##ODEMETIPI##
Kalan Tutar (Girişte Ödenecek):	##GIRISTEODEME## TL

Mesaj:
##REZERVASYONMUSTERIMESAJ##

Adres: ##ADRES##
Telefon: ##FIRMATEL## | E-mail: ##INFOMAIL##`;

const ADMIN_MAIL = `Sayın Yönetici,

##TESISADI## adlı tesis için ##TARIH1## ve ##TARIH2## tarihlerini kapsayan bir rezervasyon başvurusu yapıldı.
Rezervasyon detaylarını yönetim panelinden inceleyerek, ilgili tesisin belirtilen tarihlerdeki müsaitlik durumunu kontrol edip müşteriye geri dönüş yapınız.

##REZDETAY##

İyi çalışmalar.`;

async function main() {
  const prisma = new PrismaClient();
  try {
    const guest = await prisma.agencyMessageTemplate.updateMany({
      where: { rowNo: 11 },
      data: {
        smsBody: GUEST_SMS,
        whatsappBody: GUEST_WHATSAPP,
        mailBody: GUEST_MAIL,
        name: "Rezervasyon Talebi Geldi",
        recipient: "MİSAFİR",
        active: true,
      },
    });

    const admin = await prisma.agencyMessageTemplate.updateMany({
      where: { rowNo: 21 },
      data: {
        smsBody: "",
        whatsappBody: "",
        mailBody: ADMIN_MAIL,
        name: "Rezervasyon Talebi Geldi",
        recipient: "YÖNETİM",
        active: true,
      },
    });

    console.log("updated", { guest: guest.count, admin: admin.count });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
