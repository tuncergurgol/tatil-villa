export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const BANK_EMPHASIZE_STYLE = "font-weight:bold;font-size:15px";

const BANK_EMPHASIZE_LINE_RE =
  /^(Şirket\s+Ünvanı\s*:\s*|Ünvan\s*:\s*|IBAN\s*:\s*|Ödenecek\s+Tutar\s*:\s*|Açıklama\s*:\s*)(.+)$/i;

/** IBAN ile "Ödenecek Tutar" arasındaki boş satırı kaldırır */
export function collapseBankTransferIbanBlankLine(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(
      /(IBAN\s*:[^\n]*)\n(?:[ \t]*\n)+(Ödenecek\s+Tutar\s*:)/gi,
      "$1\n$2"
    );
}

export type ToHtmlFromTextOptions = {
  logoUrl?: string;
  /** Ünvan, IBAN, ödenecek tutar ve açıklama değerlerini kalın + 1px büyük yapar */
  emphasizeBankTransferFields?: boolean;
};

/**
 * Düz metin şablonu → e-posta HTML’i.
 * Logo üstte (HTTPS veya CID); isteğe bağlı banka alanı vurgusu.
 */
export function toHtmlFromText(
  text: string,
  logoUrlOrOptions?: string | ToHtmlFromTextOptions
): string {
  const options: ToHtmlFromTextOptions =
    typeof logoUrlOrOptions === "string"
      ? { logoUrl: logoUrlOrOptions }
      : logoUrlOrOptions ?? {};

  let normalized = text.replace(/\r\n/g, "\n");

  if (options.emphasizeBankTransferFields) {
    normalized = collapseBankTransferIbanBlankLine(normalized);
  }

  const lines = normalized.split("\n");
  const bodyHtml = lines
    .map((line) => {
      const trimmed = line.trim();

      if (options.emphasizeBankTransferFields) {
        const emphasized = renderBankEmphasizedLine(line);
        if (emphasized) return emphasized;
      }

      const escaped = escapeHtml(line);
      // Footer şirket satırları (Adres / Telefon … | E-mail); misafir "Telefon:" sola hizalı kalsın.
      if (
        /^Adres\s*:/i.test(trimmed) ||
        (/^Telefon\s*:/i.test(trimmed) && /\bE-?mail\s*:/i.test(trimmed))
      ) {
        return `<div style="text-align:center;margin:4px 0;">${escaped}</div>`;
      }
      if (!trimmed) return "<br/>";
      return `${escaped}<br/>`;
    })
    .join("");

  const logoUrl = options.logoUrl?.trim() || "";
  const logo = logoUrl
    ? `<p style="text-align:center;margin:0 0 16px;"><img src="${escapeHtml(logoUrl)}" alt="Logo" style="max-width:180px;height:auto;" /></p>`
    : "";

  return `${logo}<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">${bodyHtml}</div>`;
}

function renderBankEmphasizedLine(line: string): string | null {
  const match = line.match(BANK_EMPHASIZE_LINE_RE);
  if (!match) return null;
  const [, label, value] = match;
  return `${escapeHtml(label)}<span style="${BANK_EMPHASIZE_STYLE}">${escapeHtml(value)}</span><br/>`;
}
