import "server-only";

import { toYolcu360ApiCommissionPercentage } from "@/lib/yolcu360/commission";
import {
  getYolcu360BaseUrl,
  getYolcu360Settings,
} from "@/lib/yolcu360/settings";
import type {
  Yolcu360ApiErrorPayload,
  Yolcu360AuthResponse,
  Yolcu360CreateOrderRequest,
  Yolcu360ExtraProduct,
  Yolcu360InstallmentInfo,
  Yolcu360LocationDetail,
  Yolcu360LocationSuggestion,
  Yolcu360Order,
  Yolcu360PayRequest,
  Yolcu360PayResponse,
  Yolcu360SearchPointRequest,
  Yolcu360SearchResponse,
} from "@/lib/yolcu360/types";
import { normalizeYolcu360PayResponse } from "@/lib/yolcu360/pay-response";

type TokenCache = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpireAt: number;
};

let tokenCache: TokenCache | null = null;

export class Yolcu360ApiError extends Error {
  code?: number;
  details?: unknown;
  status: number;

  constructor(message: string, status: number, payload?: Yolcu360ApiErrorPayload) {
    super(message);
    this.name = "Yolcu360ApiError";
    this.status = status;
    this.code = payload?.code;
    this.details = payload?.details;
  }
}

async function loadCredentials() {
  const settings = await getYolcu360Settings();
  if (!settings.enabled) {
    throw new Yolcu360ApiError("Yolcu360 entegrasyonu kapalı", 503);
  }
  const apiKey = settings.apiKey?.trim();
  const apiSecret = settings.apiSecret?.trim();
  if (!apiKey || !apiSecret) {
    throw new Yolcu360ApiError("Yolcu360 API anahtarları tanımlı değil", 503);
  }
  return {
    apiKey,
    apiSecret,
    baseUrl: getYolcu360BaseUrl(settings.environment),
    settings,
  };
}

async function authenticate(force = false) {
  if (
    !force &&
    tokenCache &&
    tokenCache.accessTokenExpireAt > Date.now() + 60_000
  ) {
    return tokenCache;
  }

  const { apiKey, apiSecret, baseUrl } = await loadCredentials();

  if (
    !force &&
    tokenCache?.refreshToken &&
    tokenCache.accessTokenExpireAt <= Date.now() + 60_000
  ) {
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenCache.refreshToken }),
      cache: "no-store",
    });
    if (refreshRes.ok) {
      const data = (await refreshRes.json()) as Yolcu360AuthResponse;
      tokenCache = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpireAt: Date.parse(data.accessTokenExpireAt),
      };
      return tokenCache;
    }
  }

  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: apiKey, secret: apiSecret }),
    cache: "no-store",
  });

  if (!loginRes.ok) {
    if (loginRes.status === 403) {
      throw new Yolcu360ApiError(
        "Yolcu360 erişim engellendi (403). Sunucu IP adresinin bu ortam için whitelist’te olduğundan emin olun; staging ve production ayrı whitelist gerektirir.",
        loginRes.status
      );
    }
    const payload = (await loginRes.json().catch(() => null)) as Yolcu360ApiErrorPayload | null;
    throw new Yolcu360ApiError(
      payload?.description ?? "Yolcu360 kimlik doğrulama başarısız",
      loginRes.status,
      payload ?? undefined
    );
  }

  const data = (await loginRes.json()) as Yolcu360AuthResponse;
  tokenCache = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessTokenExpireAt: Date.parse(data.accessTokenExpireAt),
  };
  return tokenCache;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  clientIp?: string | null;
  currency?: string;
  language?: string;
  retryOnUnauthorized?: boolean;
};

async function yolcu360Request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { baseUrl } = await loadCredentials();
  const token = await authenticate();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.accessToken}`,
    "Content-Type": "application/json",
    "X-Currency": options.currency ?? "TRY",
    "Accept-Language": options.language ?? "tr",
  };
  if (options.clientIp) {
    headers["X-Forwarded-For"] = options.clientIp;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (response.status === 401 && options.retryOnUnauthorized !== false) {
    await authenticate(true);
    return yolcu360Request<T>(path, { ...options, retryOnUnauthorized: false });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = payload as Yolcu360ApiErrorPayload | null;
    throw new Yolcu360ApiError(
      errorPayload?.description ?? `Yolcu360 API hatası (${response.status})`,
      response.status,
      errorPayload ?? undefined
    );
  }

  return payload as T;
}

export async function testYolcu360Connection() {
  await authenticate(true);
  return { ok: true as const };
}

export async function searchYolcu360Locations(query: string) {
  const q = query.trim();
  if (!q) return [] as Yolcu360LocationSuggestion[];
  return yolcu360Request<Yolcu360LocationSuggestion[]>(
    `/locations?query=${encodeURIComponent(q)}`
  );
}

export async function getYolcu360Location(placeId: string) {
  return yolcu360Request<Yolcu360LocationDetail>(
    `/locations/${encodeURIComponent(placeId)}`
  );
}

export async function searchYolcu360Cars(body: Yolcu360SearchPointRequest) {
  const { settings } = await loadCredentials();
  const payload: Yolcu360SearchPointRequest = { ...body };
  if (
    settings.commissionType === "percentage" &&
    settings.commissionPercentage > 0
  ) {
    payload.commission = {
      type: "percentage",
      percentage: toYolcu360ApiCommissionPercentage(
        settings.commissionPercentage
      ),
    };
  }
  return yolcu360Request<Yolcu360SearchResponse>("/search/point", {
    method: "POST",
    body: payload,
  });
}

export async function getYolcu360ExtraProducts(searchID: string, code: string) {
  return yolcu360Request<Yolcu360ExtraProduct[]>(
    `/search/${encodeURIComponent(searchID)}/${encodeURIComponent(code)}/extra-products`
  );
}

export async function createYolcu360Order(
  body: Yolcu360CreateOrderRequest,
  clientIp?: string | null
) {
  return yolcu360Request<Yolcu360Order>("/order", {
    method: "POST",
    body,
    clientIp,
  });
}

export async function getYolcu360Order(orderID: string) {
  return yolcu360Request<Yolcu360Order>(
    `/order/${encodeURIComponent(orderID)}`
  );
}

export async function getYolcu360InstallmentInfo(orderID: string, binNumber: string) {
  return yolcu360Request<Yolcu360InstallmentInfo>("/payment/installment-info", {
    method: "POST",
    body: { orderID, binNumber },
  });
}

export async function payYolcu360Order(body: Yolcu360PayRequest) {
  const raw = await yolcu360Request<unknown>("/payment/pay", {
    method: "POST",
    body,
  });
  return normalizeYolcu360PayResponse(
    raw as Parameters<typeof normalizeYolcu360PayResponse>[0]
  );
}

export async function checkYolcu360CancelEligibility(orderID: string) {
  return yolcu360Request<{ cancellable: boolean; refundable: boolean }>(
    `/order/${encodeURIComponent(orderID)}/cancel_eligibility`,
    { method: "POST", body: {} }
  );
}

export async function cancelYolcu360Order(orderID: string) {
  return yolcu360Request<{ success: boolean; orderId?: string; status?: string }>(
    `/order/${encodeURIComponent(orderID)}/cancel`,
    { method: "POST", body: {} }
  );
}

export async function findeksCheck(identityNumber: string, integrationCode: string) {
  return yolcu360Request<{ status: string }>("/findeks/check", {
    method: "POST",
    body: { identityNumber, integrationCode },
  });
}

export async function findeksPhoneList(identityNumber: string, integrationCode: string) {
  return yolcu360Request<{ phoneList: Array<{ key: string; phone: string }> }>(
    "/findeks/phone-list",
    { method: "POST", body: { identityNumber, integrationCode } }
  );
}

export async function findeksReport(body: Record<string, string>) {
  return yolcu360Request<{ findeksCode: string }>("/findeks/report", {
    method: "POST",
    body,
  });
}

export async function findeksPinConfirm(
  findeksCode: string,
  pinCode: string,
  integrationCode: string
) {
  return yolcu360Request<void>("/findeks/pin-confirm", {
    method: "POST",
    body: { findeksCode, pinCode, integrationCode },
  });
}

export async function findeksPinRenew(findeksCode: string, integrationCode: string) {
  return yolcu360Request<void>("/findeks/pin-renew", {
    method: "POST",
    body: { findeksCode, integrationCode },
  });
}

export function clearYolcu360TokenCache() {
  tokenCache = null;
}
