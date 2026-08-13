export function formatAgencyMessageRowNo(rowNo: number): string {
  if (rowNo > 9 && rowNo % 10 !== 0) {
    const major = Math.floor(rowNo / 10);
    const minor = rowNo % 10;
    return `${major}.${minor}`;
  }
  return String(rowNo);
}

export function getAgencyMessageRowSortKey(rowNo: number): number {
  if (rowNo > 9 && rowNo % 10 !== 0) {
    return rowNo / 10;
  }
  return rowNo;
}

export const AGENCY_MESSAGE_TEMPLATE_ROW_1 = 11;
export const AGENCY_MESSAGE_TEMPLATE_ROW_2 = 21;
/** Yeni rezervasyon talebi yönetim bildirimi (rowNo: 201) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_201 = 201;
/** Misafir konfirmasyon onayı yönetim bildirimi (rowNo: 202) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_202 = 202;
/** iyzico tahsilat alındı yönetim bildirimi (UI: 20.3, rowNo: 203) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_20_3 = 203;
/** Ön ödeme — Banka Havale/Eft (UI: 10.2) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_10_2 = 102;
/** Ön ödeme — Kredi Kartı/Sanal POS (UI: 10.3) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_10_3 = 103;
/** @deprecated Eski 1.6 kodlaması; fallback için tutuluyor */
export const AGENCY_MESSAGE_TEMPLATE_ROW_1_6 = 16;
/** @deprecated Eski 1.7 kodlaması; fallback için tutuluyor */
export const AGENCY_MESSAGE_TEMPLATE_ROW_1_7 = 17;
export const AGENCY_MESSAGE_TEMPLATE_ROW_3_1 = 31;
/** Konfirme onay talebi (UI: 10.4) — misafire onay linki */
export const AGENCY_MESSAGE_TEMPLATE_ROW_10_4 = 104;
/** @deprecated Eski kodlama; 10.4 ile aynı kayıt */
export const AGENCY_MESSAGE_TEMPLATE_ROW_4 = AGENCY_MESSAGE_TEMPLATE_ROW_10_4;
/** Rezervasyon belgesi gönderildi (UI: 10.5) — misafir onayından sonra PDF mail */
export const AGENCY_MESSAGE_TEMPLATE_ROW_10_5 = 105;
/** Rezervasyon belgesi — yönetim kopyası (UI: 20.5, rowNo: 205); 10.5 ile aynı mail gövdesi */
export const AGENCY_MESSAGE_TEMPLATE_ROW_20_5 = 205;
/** Giriş bilgilendirme / müşteri bilgilendirme (UI: 11.1, rowNo: 111) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_11_1 = 111;
/** Çıkıştan 1 gün önce misafir hatırlatma (UI: 11.3, rowNo: 113) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_11_3 = 113;
/** Yorum daveti (UI: 11.4, rowNo: 114) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_11_4 = 114;
/** Villa yetkilisi / karşılayan bilgilendirme (UI: 40.1, rowNo: 401) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_40_1 = 401;
/** Takvim kapat bilgisi — takvim yönetene (UI: 30.3, rowNo: 303) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_30_3 = 303;
/** Havuz ısıtma — karşılayan (UI: 40.2, rowNo: 402) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_40_2 = 402;
/** Çıkıştan 1 gün önce karşılayan (UI: 40.3, rowNo: 403) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_40_3 = 403;
