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
/** Ön ödeme — Banka Havale/Eft (UI: 10.2) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_10_2 = 102;
/** Ön ödeme — Kredi Kartı/Sanal POS (UI: 10.3) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_10_3 = 103;
/** @deprecated Eski 1.6 kodlaması; fallback için tutuluyor */
export const AGENCY_MESSAGE_TEMPLATE_ROW_1_6 = 16;
/** @deprecated Eski 1.7 kodlaması; fallback için tutuluyor */
export const AGENCY_MESSAGE_TEMPLATE_ROW_1_7 = 17;
export const AGENCY_MESSAGE_TEMPLATE_ROW_3_1 = 31;
/** Konfirme belgesi gönderildi (UI: 10.4) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_10_4 = 104;
/** @deprecated Eski kodlama; 10.4 ile aynı kayıt */
export const AGENCY_MESSAGE_TEMPLATE_ROW_4 = AGENCY_MESSAGE_TEMPLATE_ROW_10_4;
/** Giriş bilgilendirme / müşteri bilgilendirme (UI: 11.1, rowNo: 111) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_11_1 = 111;
/** Villa yetkilisi / karşılayan bilgilendirme (UI: 40.1, rowNo: 401) */
export const AGENCY_MESSAGE_TEMPLATE_ROW_40_1 = 401;
