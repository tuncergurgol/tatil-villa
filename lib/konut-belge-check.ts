export const KONUT_BELGE_CHECK_BASE_URL =
  "https://vatandas.ktb.gov.tr/konut-belge";

export type KonutBelgeCheckStatus = "PENDING" | "VALID" | "INVALID" | "ERROR";

export type KonutBelgeCheckResult = {
  status: KonutBelgeCheckStatus;
  checkUrl: string;
  checkedAt: string | null;
  errorMessage?: string;
};

export function buildKonutBelgeCheckUrl(documentNo: string) {
  const normalized = documentNo.trim();
  return `${KONUT_BELGE_CHECK_BASE_URL}/${encodeURIComponent(normalized)}`;
}

export function formatKonutBelgeCheckLabel(status: KonutBelgeCheckStatus) {
  switch (status) {
    case "VALID":
      return "GEÇERLİ";
    case "INVALID":
    case "ERROR":
      return "GEÇERSİZ";
    default:
      return "BEKLEMEDE";
  }
}

export async function verifyKonutBelgeOnline(
  documentNo: string
): Promise<KonutBelgeCheckResult> {
  const normalized = documentNo.trim();
  const checkUrl = buildKonutBelgeCheckUrl(normalized);

  if (!normalized) {
    return {
      status: "ERROR",
      checkUrl,
      checkedAt: new Date().toISOString(),
      errorMessage: "Belge numarası boş",
    };
  }

  try {
    const response = await fetch(checkUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    const html = await response.text();
    const checkedAt = new Date().toISOString();

    if (!response.ok) {
      return {
        status: "INVALID",
        checkUrl,
        checkedAt,
        errorMessage: `HTTP ${response.status}`,
      };
    }

    const isApproved =
      html.includes("Onaylandı") ||
      html.toLocaleLowerCase("tr-TR").includes("onaylandı");

    return {
      status: isApproved ? "VALID" : "INVALID",
      checkUrl,
      checkedAt,
    };
  } catch (error) {
    return {
      status: "ERROR",
      checkUrl,
      checkedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : "Kontrol başarısız",
    };
  }
}
