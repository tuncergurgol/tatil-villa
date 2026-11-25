export const CONFIRMATION_SENT_MESSAGE_NAME = "Konfirme Belgesi Gonderildi";

/** E-posta: yeşil CTA bar için markdown link satırı */
export const CONFIRMATION_SENT_MAIL_BODY = `Sayın ##MUSTERIADI##,

##REZKOD## kodlu rezervasyonunuzun kesinleşmesi için aşağıdaki onay linkine tıklayarak misafir bilgilerinizi girip işlemi tamamlayınız. Rezervasyon Belgeniz, onay verdikten sonra tarafınıza iletilecektir.

[ONAYLAMAK İÇİN TIKLAYIN](##ONAYLINK##)

Genel Uyarılar:

* Giriş saatimiz 16:00'dır; bu saatten önce giriş yapılamaz.
* Çıkış saatimiz 10:00'dır; konaklamanız bu saatte sona erer.
* Web sitemizde belirtilen "kiralama şartları ve sözleşmesi" dışındaki sözlü beyanların geçerliliği yoktur.
* Sorularınız için ##FIRMATEL## numaralı telefondan 09:00 - 23:00 saatleri arasında bize ulaşabilirsiniz.

Adres: ##ADRES##
Telefon: ##FIRMATEL## | E-mail: ##INFOMAIL##`;

/**
 * WhatsApp / SMS: aynı metin; CTA düz satır + URL (markdown WA’da bozulmasın).
 * E-posta HTML dönüştürücü "ONAYLAMAK…" + sonraki URL satırını da yeşil bara çevirir.
 */
export const CONFIRMATION_SENT_WHATSAPP_BODY = `Sayın ##MUSTERIADI##,

##REZKOD## kodlu rezervasyonunuzun kesinleşmesi için aşağıdaki onay linkine tıklayarak misafir bilgilerinizi girip işlemi tamamlayınız. Rezervasyon Belgeniz, onay verdikten sonra tarafınıza iletilecektir.

ONAYLAMAK İÇİN TIKLAYIN
##ONAYLINK##

Genel Uyarılar:

* Giriş saatimiz 16:00'dır; bu saatten önce giriş yapılamaz.
* Çıkış saatimiz 10:00'dır; konaklamanız bu saatte sona erer.
* Web sitemizde belirtilen "kiralama şartları ve sözleşmesi" dışındaki sözlü beyanların geçerliliği yoktur.
* Sorularınız için ##FIRMATEL## numaralı telefondan 09:00 - 23:00 saatleri arasında bize ulaşabilirsiniz.

Adres: ##ADRES##
Telefon: ##FIRMATEL## | E-mail: ##INFOMAIL##`;
