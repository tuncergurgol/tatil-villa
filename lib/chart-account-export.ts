export const CHART_ACCOUNT_KIND = {
  CUSTOMER: "CUSTOMER",
  OWNER: "OWNER",
} as const;

export type ChartAccountKind =
  (typeof CHART_ACCOUNT_KIND)[keyof typeof CHART_ACCOUNT_KIND];

export const CHART_ACCOUNT_CSV_HEADERS = [
  "Hesap Kodu*",
  "Hesap Adı*",
  "Vergi No",
  "Vergi Dairesi",
  "T.C. Kimlik No",
  "Adres",
  "Döviz",
  "E-Posta",
  "Kdv Oran",
  "Kdv Hesap Kodu",
] as const;

export type ChartAccountCsvRow = {
  accountCode: string;
  accountName: string;
  taxNumber: string;
  taxOffice: string;
  tcKimlikNo: string;
  address: string;
  currency: string;
  email: string;
  vatRate: string;
  vatAccountCode: string;
};

export function customerChartAccountCode(reservationNo: string) {
  const no = reservationNo.trim();
  if (!no || no === "—") return "";
  return `340.01.${no}`;
}

/** Ev sahibi kartındaki muhasebe kodunu 320.01 önekiyle birleştirir. */
export function ownerChartAccountCode(accountingCode: string) {
  const code = accountingCode.trim();
  if (!code) return "";
  if (/^320\.01\.\S+/.test(code)) return code;
  if (/^320\.01$/.test(code)) return "";
  return `320.01.${code}`;
}

function csvCell(value: string) {
  const text = value.replace(/\r?\n/g, " ").trim();
  if (/[;"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function buildChartAccountCsv(rows: ChartAccountCsvRow[]) {
  const lines = [
    CHART_ACCOUNT_CSV_HEADERS.join(";"),
    ...rows.map((row) =>
      [
        row.accountCode,
        row.accountName,
        row.taxNumber,
        row.taxOffice,
        row.tcKimlikNo,
        row.address,
        row.currency,
        row.email,
        row.vatRate,
        row.vatAccountCode,
      ]
        .map(csvCell)
        .join(";")
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}
