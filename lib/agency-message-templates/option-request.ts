export const OPTION_REQUEST_MESSAGE_NAME = "Opsiyon İste";

/**
 * Mesaj İçeriği 30.2 (rowNo 302) — takvim yönetene opsiyon talebi.
 * Alıcı: Villa.calendarManagerPhone (Evolution / Takvim WhatsApp).
 */
export const OPTION_REQUEST_WHATSAPP_BODY = `Sayın ##KARŞILAYAN##,
##TESISADI## (##TESİSORJİNALADI##)
##GIRIS## giriş / ##CIKIS## çıkış (Toplam ##GECE## gece) için OPSİYON LÜTFEN.
##FİRMAADI##`;

export const OPTION_REQUEST_SMS_BODY = OPTION_REQUEST_WHATSAPP_BODY;

export const OPTION_REQUEST_MAIL_BODY = "";
