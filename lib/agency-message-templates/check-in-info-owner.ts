export const CHECK_IN_INFO_OWNER_MESSAGE_NAME =
  "Tatilden 1 Gün Önce Rezervasyon Bilgi";

/**
 * Mesaj İçeriği 40.1 (rowNo 401) — villa yetkilisi / karşılayan varsayılan gövdesi.
 * DB’deki aktif şablon önceliklidir; seed eksik veya hatalı kayıt için kullanır.
 */
export const CHECK_IN_INFO_OWNER_WHATSAPP_BODY = `Sayın ##Müşteri Karşılayan##,
##vVILLAADI## (##VILLAORJINALADI##), ##TARIHLER## için ##REZID## nolu rezervasyonunuz ile ilgili giriş bilgilerine aşağıdaki linkten ulaşabilirsiniz.
##FİRMAADI##

##EVSAHIBIGIRISLINK##`;

export const CHECK_IN_INFO_OWNER_MAIL_BODY = `Sayın ##Müşteri Karşılayan##,

##vVILLAADI## (##VILLAORJINALADI##), ##TARIHLER## için ##REZID## nolu rezervasyon ile ilgili giriş bilgilerine aşağıdaki linkten ulaşabilirsiniz.

[GİRİŞ BİLGİLERİNİ GÖRÜNTÜLE](##EVSAHIBIGIRISLINK##)

##FİRMAADI##

Adres: ##ADRES##
Telefon: ##FIRMATEL## | E-mail: ##INFOMAIL##`;
