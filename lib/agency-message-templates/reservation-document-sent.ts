export const RESERVATION_DOCUMENT_SENT_MESSAGE_NAME =
  "Rezervasyon Belgesi Gonderildi";

/**
 * Mesaj İçeriği 10.5 (rowNo 105) — misafir konfirme onayından sonra PDF belge maili.
 * Site logosu HTML’de üstte basılır (##SITELOGO## metinde boş bırakılır).
 */
export const RESERVATION_DOCUMENT_SENT_MAIL_BODY = `Sayın ##MUSTERIADI##,

##REZKOD## kodlu rezervasyonunuz konfirme edilmiştir.

Rezervasyon belgeniz (konfirme belgesi ve online rezervasyon sözleşmesi) bu e-postanın ekindedir. Lütfen belgeyi saklayınız.

Tesis: ##TESISADI##
Giriş: ##GIRISTARIHI## ##GIRISSAATI##
Çıkış: ##CIKISTARIHI## ##CIKISSAATI##

Sorularınız için ##FIRMATEL## numaralı telefondan bize ulaşabilirsiniz.

##SITEADI##

Adres: ##ADRES##
Telefon: ##FIRMATEL## | E-mail: ##INFOMAIL##`;

/**
 * WhatsApp: PDF e-postada; metinde site adı (##SITEADI##) zorunlu.
 */
export const RESERVATION_DOCUMENT_SENT_WHATSAPP_BODY = `Sayın ##MUSTERIADI##,

##REZKOD## kodlu rezervasyonunuz konfirme edilmiştir.

Konfirme belgeniz (rezervasyon belgesi + online rezervasyon sözleşmesi) e-posta adresinize PDF olarak gönderilmiştir. Lütfen belgeyi saklayınız.

Tesis: ##TESISADI##
Giriş: ##GIRISTARIHI## ##GIRISSAATI##
Çıkış: ##CIKISTARIHI## ##CIKISSAATI##

Sorularınız için ##FIRMATEL## numaralı telefondan bize ulaşabilirsiniz.

##SITEADI##`;
