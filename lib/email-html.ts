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
  const bodyParts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    const markdownCta = parseMarkdownLinkLine(trimmed);
    if (markdownCta) {
      bodyParts.push(renderCtaButton(markdownCta.label, markdownCta.href));
      continue;
    }

    // "ONAYLAMAK İÇİN TIKLAYIN" + sonraki satırda URL → yeşil bar
    if (/^ONAYLAMAK\s+İÇİN\s+TIKLAYIN\.?$/i.test(trimmed)) {
      const next = (lines[i + 1] ?? "").trim();
      if (/^https?:\/\//i.test(next)) {
        bodyParts.push(renderCtaButton(trimmed, next));
        i += 1;
        continue;
      }
    }

    if (options.emphasizeBankTransferFields) {
      const emphasized = renderBankEmphasizedLine(line);
      if (emphasized) {
        bodyParts.push(emphasized);
        continue;
      }
    }

    const escaped = escapeHtml(line);
    // "116005 kodlu rezervasyonunuz konfirme edilmiştir." → kod sarı vurgu
    const confirmMatch = trimmed.match(
      /^(\S+)(\s+kodlu rezervasyonunuz konfirme edilmiştir\.?)$/i
    );
    if (confirmMatch) {
      bodyParts.push(
        `<span style="background-color:#FFE566;padding:1px 4px;">${escapeHtml(confirmMatch[1]!)}</span>${escapeHtml(confirmMatch[2]!)}<br/>`
      );
      continue;
    }
    // Footer şirket satırları (Adres / Telefon … | E-mail); misafir "Telefon:" sola hizalı kalsın.
    if (
      /^Adres\s*:/i.test(trimmed) ||
      (/^Telefon\s*:/i.test(trimmed) && /\bE-?mail\s*:/i.test(trimmed))
    ) {
      bodyParts.push(
        `<div style="text-align:center;margin:4px 0;">${escaped}</div>`
      );
      continue;
    }
    if (!trimmed) {
      bodyParts.push("<br/>");
      continue;
    }
    bodyParts.push(`${escaped}<br/>`);
  }

  const bodyHtml = bodyParts.join("");

  const logoUrl = options.logoUrl?.trim() || "";
  const logo = logoUrl
    ? `<p style="text-align:center;margin:0 0 16px;"><img src="${escapeHtml(logoUrl)}" alt="Logo" width="180" style="display:inline-block;width:180px;max-width:180px;height:auto;" /></p>`
    : "";

  return `${logo}<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;">${bodyHtml}</div>`;
}

function renderBankEmphasizedLine(line: string): string | null {
  const match = line.match(BANK_EMPHASIZE_LINE_RE);
  if (!match) return null;
  const [, label, value] = match;
  return `${escapeHtml(label)}<span style="${BANK_EMPHASIZE_STYLE}">${escapeHtml(value)}</span><br/>`;
}

const MARKDOWN_LINK_LINE_RE = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/i;

/** Örn. [ONAYLAMAK İÇİN TIKLAYIN](https://...) */
function parseMarkdownLinkLine(
  line: string
): { label: string; href: string } | null {
  const match = line.match(MARKDOWN_LINK_LINE_RE);
  if (!match) return null;
  return { label: match[1]!.trim(), href: match[2]!.trim() };
}

/** Yeşil yatay CTA bar (konfirme onay maili) */
function renderCtaButton(label: string, href: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<div style="margin:16px 0;"><a href="${safeHref}" style="display:block;background-color:#b4d7a8;color:#111111;text-align:center;padding:14px 12px;text-decoration:none;font-weight:bold;font-size:14px;line-height:1.3;">${safeLabel}</a></div>`;
}
