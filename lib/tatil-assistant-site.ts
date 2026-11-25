export type AssistantPublicSite = {
  siteKey: string;
  domain: string;
  brand: string;
};

export const TATILDEYIZ_ASSISTANT_SITE: AssistantPublicSite = {
  siteKey: "tatildeyiz",
  domain: "www.tatildeyiz.com.tr",
  brand: "Tatildeyiz",
};

const SITES: Array<AssistantPublicSite & { apex: string; hints: string[] }> = [
  {
    siteKey: "glamping-turkey",
    domain: "www.glampingturkey.com",
    brand: "Glamping Turkey",
    apex: "glampingturkey.com",
    hints: ["glamping turkey", "glampingturkey"],
  },
  {
    siteKey: "balayi-villacisi",
    domain: "www.balayivillacisi.com",
    brand: "Balayı Villacısı",
    apex: "balayivillacisi.com",
    hints: ["balayı villacısı", "balayi villacisi", "balayivillacisi"],
  },
  {
    siteKey: "tatil-villacisi",
    domain: "www.tatilvillacisi.com",
    brand: "Tatil Villacısı",
    apex: "tatilvillacisi.com",
    hints: ["tatil villacısı", "tatil villacisi", "tatilvillacisi"],
  },
  {
    siteKey: "tatildeyiz",
    domain: "www.tatildeyiz.com.tr",
    brand: "Tatildeyiz",
    apex: "tatildeyiz.com.tr",
    hints: ["tatildeyiz"],
  },
];

function fold(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u");
}

function hostApex(host: string) {
  return fold(host)
    .replace(/^https?:\/\//, "")
    .split("/")[0]!
    .split(":")[0]!
    .replace(/^www\./, "");
}

export function resolveAssistantSiteFromHost(
  host: string | null | undefined
): AssistantPublicSite | null {
  const apex = hostApex(host ?? "");
  if (!apex || apex === "localhost" || apex.startsWith("bont.")) return null;
  const found = SITES.find(
    (site) => apex === site.apex || apex.endsWith(`.${site.apex}`)
  );
  return found
    ? { siteKey: found.siteKey, domain: found.domain, brand: found.brand }
    : null;
}

export function resolveAssistantSiteFromText(text: string): AssistantPublicSite | null {
  const folded = fold(text);
  const found = SITES.find((site) =>
    site.hints.some((hint) => folded.includes(fold(hint)))
  );
  return found
    ? { siteKey: found.siteKey, domain: found.domain, brand: found.brand }
    : null;
}

export function resolveAssistantPublicSite(input: {
  text?: string | null;
  host?: string | null;
  stored?: AssistantPublicSite | null;
}): AssistantPublicSite {
  return (
    resolveAssistantSiteFromText(input.text ?? "") ??
    resolveAssistantSiteFromHost(input.host) ??
    input.stored ??
    TATILDEYIZ_ASSISTANT_SITE
  );
}
