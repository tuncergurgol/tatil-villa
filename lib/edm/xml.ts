export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function xmlText(tag: string, value: string, xmlns = false): string {
  const ns = xmlns ? ' xmlns=""' : "";
  return `<${tag}${ns}>${escapeXml(value)}</${tag}>`;
}

export function firstXmlTagValue(xml: string, tagName: string): string | null {
  const re = new RegExp(
    `<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`,
    "i"
  );
  const match = xml.match(re);
  if (!match?.[1]) return null;
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function allXmlTagValues(xml: string, tagName: string): string[] {
  const re = new RegExp(
    `<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`,
    "gi"
  );
  const values: string[] = [];
  for (const match of xml.matchAll(re)) {
    const value = match[1]
      ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (value) values.push(value);
  }
  return values;
}

export function firstXmlAttr(
  xml: string,
  tagName: string,
  attrName: string
): string | null {
  const re = new RegExp(`<${tagName}\\b([^>]*)>`, "i");
  const match = xml.match(re);
  if (!match?.[1]) return null;
  const attr = match[1].match(
    new RegExp(`${attrName}\\s*=\\s*"([^"]*)"`, "i")
  );
  return attr?.[1] ?? null;
}

export function soapFaultMessage(xml: string): string | null {
  const faultString =
    firstXmlTagValue(xml, "faultstring") ||
    firstXmlTagValue(xml, "ERROR_SHORT_DES") ||
    firstXmlTagValue(xml, "ERROR_LONG_DES") ||
    firstXmlTagValue(xml, "ERROR_CODE");
  return faultString;
}
