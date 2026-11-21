const IBAN_PATTERN = /\b(TR\d{2}(?:\s?\d{4}){5}\s?\d{2})\b/gi;

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function copyButtonHtml(value: string) {
  return `<button type="button" class="cms-copy-btn ml-1.5 inline-flex h-6 w-6 shrink-0 translate-y-[-1px] items-center justify-center rounded-md text-teal-600/80 transition hover:bg-teal-50 hover:text-teal-700 align-middle" aria-label="Kopyala" title="Kopyala" data-copy="${escapeAttr(value)}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>`;
}

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * CMS HTML içine Hesap Sahibi ve IBAN değerleri için kopyala butonları ekler.
 */
export function injectCmsCopyButtons(html: string): string {
  if (!html) return html;

  let result = html;

  // <strong>Hesap Sahibi:</strong> <span><strong>ŞİRKET</strong></span>
  result = result.replace(
    /(<strong>\s*Hesap\s+Sahibi:\s*<\/strong>)(\s*)(<(?:span|strong|b)\b[^>]*>[\s\S]*?<\/(?:span|strong|b)>)/gi,
    (full, label: string, space: string, valueEl: string) => {
      if (/cms-copy-btn|data-copy=/.test(full)) return full;
      const text = stripTags(valueEl);
      if (!text) return full;
      return `${label}${space}${valueEl}${copyButtonHtml(text)}`;
    }
  );

  // Hesap Sahibi: ŞİRKET aynı metin düğümünde (etiket kapanmadan önce)
  result = result.replace(
    /(Hesap\s+Sahibi:\s*)([^<]{3,240}?)(?=<)/gi,
    (full, label: string, value: string) => {
      if (/cms-copy-btn|data-copy=/.test(full)) return full;
      const trimmed = value.trim();
      if (!trimmed) return full;
      const leading = value.match(/^\s*/)?.[0] ?? "";
      return `${label}${leading}${trimmed}${copyButtonHtml(trimmed)}`;
    }
  );

  // IBAN — zaten buton eklenmiş eşleşmeleri atla
  result = result.replace(IBAN_PATTERN, (iban, _group, offset: number, source: string) => {
    const after = source.slice(offset + iban.length, offset + iban.length + 120);
    if (after.includes("cms-copy-btn") || after.includes("data-copy=")) {
      return iban;
    }
    const before = source.slice(Math.max(0, offset - 60), offset);
    if (before.includes("cms-copy-value") || before.includes("data-copy=")) {
      return iban;
    }
    const compact = iban.replace(/\s+/g, "").toUpperCase();
    return `<span class="cms-copy-value">${iban}</span>${copyButtonHtml(compact)}`;
  });

  return result;
}
