import type { Yolcu360PayResponse } from "@/lib/yolcu360/types";

type RawPayResponse = {
  status?: string;
  is3dsSecure?: boolean;
  threeDSHtmlContent?: string | null;
};

function decodeThreeDSHtml(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("<")) return content;
  try {
    return Buffer.from(trimmed, "base64").toString("utf8");
  } catch {
    return content;
  }
}

function normalizePayStatus(
  item: RawPayResponse
): Yolcu360PayResponse["status"] {
  const status = item.status?.toLowerCase();
  if (status === "success") return "success";
  if (status === "redirect_required" || status === "pending") {
    return "redirect_required";
  }
  if (status === "failed") return "failed";
  if (item.is3dsSecure && item.threeDSHtmlContent) return "redirect_required";
  return "failed";
}

export function normalizeYolcu360PayResponse(
  raw: RawPayResponse | RawPayResponse[] | null | undefined
): Yolcu360PayResponse {
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item) {
    return { status: "failed" };
  }

  const status = normalizePayStatus(item);
  const threeDSHtmlContent = item.threeDSHtmlContent
    ? decodeThreeDSHtml(item.threeDSHtmlContent)
    : undefined;

  return {
    status,
    is3dsSecure: item.is3dsSecure ?? status === "redirect_required",
    threeDSHtmlContent,
  };
}

export function isYolcu360PayRedirect(
  response: Yolcu360PayResponse
): response is Yolcu360PayResponse & { threeDSHtmlContent: string } {
  return Boolean(
    response.threeDSHtmlContent &&
      (response.is3dsSecure || response.status === "redirect_required")
  );
}
