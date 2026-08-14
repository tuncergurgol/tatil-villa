import crypto from "crypto";

/** iyzico IYZWSv2 Authorization header üretir. */
export function createIyzicoAuthorizationHeader(
  apiKey: string,
  secretKey: string,
  uriPath: string,
  requestBody: string
): string {
  const randomKey = `${Date.now()}${Math.floor(Math.random() * 1_000_000_000)}`;
  const payload = randomKey + uriPath + requestBody;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(payload, "utf8")
    .digest("hex");
  const authorizationString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  const base64 = Buffer.from(authorizationString, "utf8").toString("base64");
  return `IYZWSv2 ${base64}`;
}

/** CF retrieve yanıt imzasını doğrular (opsiyonel güvenlik). */
export function verifyIyzicoCfRetrieveSignature(
  secretKey: string,
  response: {
    paymentStatus?: string;
    paymentId?: string;
    currency?: string;
    basketId?: string;
    conversationId?: string;
    paidPrice?: number | string;
    price?: number | string;
    token?: string;
    signature?: string;
  }
): boolean {
  const signature = response.signature?.trim();
  if (!signature) return false;

  const params = [
    response.paymentStatus ?? "",
    response.paymentId ?? "",
    response.currency ?? "",
    response.basketId ?? "",
    response.conversationId ?? "",
    String(response.paidPrice ?? ""),
    String(response.price ?? ""),
    response.token ?? "",
  ];
  const dataToEncrypt = params.join(":");
  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(dataToEncrypt, "utf8")
    .digest("hex");
  return expected === signature;
}
