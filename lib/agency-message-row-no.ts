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
export const AGENCY_MESSAGE_TEMPLATE_ROW_1_6 = 16;
export const AGENCY_MESSAGE_TEMPLATE_ROW_1_7 = 17;
export const AGENCY_MESSAGE_TEMPLATE_ROW_3_1 = 31;
export const AGENCY_MESSAGE_TEMPLATE_ROW_4 = 4;
