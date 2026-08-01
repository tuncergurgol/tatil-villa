export type WahaSessionStatus =
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "WORKING"
  | "FAILED"
  | string;

export type WahaSessionInfo = {
  name: string;
  status?: WahaSessionStatus;
  me?: {
    id?: string;
    pushName?: string;
  } | null;
};

export type WahaQrResponse = {
  mimetype?: string;
  data?: string;
};

export type WahaPairingCodeResponse = {
  code?: string;
};

export type NormalizedWahaConnection = {
  status: string;
  pushName: string | null;
  phoneId: string | null;
  rawStatus: WahaSessionStatus | null;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, "");
}

function buildHeaders(apiKey: string, extra?: Record<string, string>) {
  return {
    "X-Api-Key": apiKey,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra,
  };
}

async function parseWahaError(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as {
      message?: string | string[];
      error?: string;
      detail?: string;
    };
    const message = json.message;
    if (Array.isArray(message)) return message.join(", ");
    return (
      message ??
      json.error ??
      json.detail ??
      text ??
      `WAHA API hata (${res.status})`
    );
  } catch {
    return text || `WAHA API hata (${res.status})`;
  }
}

export async function wahaRequest<T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...buildHeaders(apiKey),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    throw new Error(await parseWahaError(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function normalizePhoneNumberForWaha(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `90${digits.slice(1)}`;
  }
  return digits;
}

export function mapWahaStatus(status: WahaSessionStatus | null | undefined): string {
  if (!status) return "STOPPED";
  if (status === "WORKING") return "WORKING";
  if (status === "SCAN_QR_CODE") return "SCAN_QR_CODE";
  if (status === "STARTING") return "STARTING";
  if (status === "FAILED") return "FAILED";
  if (status === "STOPPED") return "STOPPED";
  return status;
}

export function normalizeWahaConnection(
  session: WahaSessionInfo | null
): NormalizedWahaConnection | null {
  if (!session) return null;
  const phoneId = session.me?.id?.trim() || null;
  const pushName = session.me?.pushName?.trim() || null;
  const rawStatus = session.status ?? null;
  const status =
    phoneId && mapWahaStatus(rawStatus) !== "WORKING"
      ? "WORKING"
      : mapWahaStatus(rawStatus);

  return {
    status,
    pushName,
    phoneId,
    rawStatus,
  };
}

export function getDockerReachableWebhookUrl(webhookUrl: string) {
  try {
    const url = new URL(webhookUrl);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = "host.docker.internal";
    }
    return url.toString();
  } catch {
    return webhookUrl;
  }
}

export async function getWahaSession(
  baseUrl: string,
  apiKey: string,
  sessionName: string
) {
  try {
    return await wahaRequest<WahaSessionInfo>(
      baseUrl,
      apiKey,
      `/api/sessions/${encodeURIComponent(sessionName)}`
    );
  } catch {
    return null;
  }
}

export async function getWahaConnectionState(
  baseUrl: string,
  apiKey: string,
  sessionName: string
) {
  const session = await getWahaSession(baseUrl, apiKey, sessionName);
  return normalizeWahaConnection(session);
}

export async function createWahaSession(
  baseUrl: string,
  apiKey: string,
  sessionName: string,
  webhookUrl?: string,
  webhookSecret?: string
) {
  const config: Record<string, unknown> = {
    client: {
      deviceName: "Tatildeyiz",
      browserName: "Chrome",
    },
  };

  if (webhookUrl?.trim()) {
    const url = new URL(getDockerReachableWebhookUrl(webhookUrl));
    if (webhookSecret) {
      url.searchParams.set("secret", webhookSecret);
    }
    config.webhooks = [
      {
        url: url.toString(),
        events: ["message", "session.status"],
      },
    ];
  }

  return wahaRequest<WahaSessionInfo>(baseUrl, apiKey, "/api/sessions", {
    method: "POST",
    body: JSON.stringify({
      name: sessionName,
      config,
    }),
  });
}

export async function startWahaSession(
  baseUrl: string,
  apiKey: string,
  sessionName: string
) {
  return wahaRequest<WahaSessionInfo>(
    baseUrl,
    apiKey,
    `/api/sessions/${encodeURIComponent(sessionName)}/start`,
    { method: "POST" }
  );
}

export async function restartWahaSession(
  baseUrl: string,
  apiKey: string,
  sessionName: string
) {
  return wahaRequest<WahaSessionInfo>(
    baseUrl,
    apiKey,
    `/api/sessions/${encodeURIComponent(sessionName)}/restart`,
    { method: "POST" }
  );
}

export async function logoutWahaSession(
  baseUrl: string,
  apiKey: string,
  sessionName: string
) {
  return wahaRequest(
    baseUrl,
    apiKey,
    `/api/sessions/${encodeURIComponent(sessionName)}/logout`,
    { method: "POST" }
  );
}

export async function ensureWahaSession(
  baseUrl: string,
  apiKey: string,
  sessionName: string,
  webhookUrl?: string,
  webhookSecret?: string
) {
  const existing = await getWahaSession(baseUrl, apiKey, sessionName);
  if (existing) {
    if (existing.status === "STOPPED" || existing.status === "FAILED") {
      try {
        await startWahaSession(baseUrl, apiKey, sessionName);
      } catch {
        // start başarısız olsa da mevcut oturum kullanılabilir
      }
    }
    return existing;
  }

  return createWahaSession(
    baseUrl,
    apiKey,
    sessionName,
    webhookUrl,
    webhookSecret
  );
}

export async function forceRestartWahaSession(
  baseUrl: string,
  apiKey: string,
  sessionName: string,
  webhookUrl?: string,
  webhookSecret?: string
) {
  try {
    await logoutWahaSession(baseUrl, apiKey, sessionName);
  } catch {
    // ignore
  }

  try {
    await restartWahaSession(baseUrl, apiKey, sessionName);
  } catch {
    try {
      await startWahaSession(baseUrl, apiKey, sessionName);
    } catch {
      await createWahaSession(
        baseUrl,
        apiKey,
        sessionName,
        webhookUrl,
        webhookSecret
      );
    }
  }
}

export async function getWahaQrDataUrl(
  baseUrl: string,
  apiKey: string,
  sessionName: string
): Promise<string | null> {
  try {
    const data = await wahaRequest<WahaQrResponse>(
      baseUrl,
      apiKey,
      `/api/${encodeURIComponent(sessionName)}/auth/qr?format=image`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
    if (!data?.data) return null;
    const mime = data.mimetype || "image/png";
    if (data.data.startsWith("data:")) return data.data;
    return `data:${mime};base64,${data.data}`;
  } catch {
    return null;
  }
}

export async function requestWahaPairingCode(
  baseUrl: string,
  apiKey: string,
  sessionName: string,
  phoneNumber: string
) {
  const data = await wahaRequest<WahaPairingCodeResponse>(
    baseUrl,
    apiKey,
    `/api/${encodeURIComponent(sessionName)}/auth/request-code`,
    {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    }
  );
  return data?.code?.trim() || null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isWahaSessionAvailabilityError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("session status is not as expected") ||
    lower.includes("session not found") ||
    lower.includes("session is not working")
  );
}

export function translateWahaUserError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("session status is not as expected")) {
    return "Bildirim WhatsApp oturumu hazır değil. Admin → Acente → Bildirim WhatsApp sayfasından bağlantıyı kontrol edin veya oturumu yeniden başlatın.";
  }
  if (lower.includes("scan_qr_code") || lower.includes("scan qr")) {
    return "WhatsApp yeniden eşleştirme gerekiyor. Bildirim WhatsApp sayfasından QR kodu okutun.";
  }
  return message;
}

export function isWahaSessionReady(
  connection: NormalizedWahaConnection | null | undefined
) {
  if (!connection) return false;
  return connection.status === "WORKING" || Boolean(connection.phoneId);
}

export async function waitForWahaSessionReady(
  baseUrl: string,
  apiKey: string,
  sessionName: string,
  options?: { attempts?: number; delayMs?: number }
) {
  const attempts = options?.attempts ?? 10;
  const delayMs = options?.delayMs ?? 1000;

  for (let index = 0; index < attempts; index += 1) {
    const connection = await getWahaConnectionState(baseUrl, apiKey, sessionName);
    if (isWahaSessionReady(connection)) {
      return connection;
    }
    if (connection?.status === "FAILED") {
      return connection;
    }
    await sleep(delayMs);
  }

  return getWahaConnectionState(baseUrl, apiKey, sessionName);
}

export async function recoverWahaSessionForSend(
  baseUrl: string,
  apiKey: string,
  sessionName: string,
  webhookUrl?: string,
  webhookSecret?: string
) {
  const current = await getWahaConnectionState(baseUrl, apiKey, sessionName);

  if (isWahaSessionReady(current)) {
    return current;
  }

  if (!current || current.status === "STOPPED" || current.status === "FAILED") {
    try {
      await ensureWahaSession(
        baseUrl,
        apiKey,
        sessionName,
        webhookUrl,
        webhookSecret
      );
    } catch {
      try {
        await startWahaSession(baseUrl, apiKey, sessionName);
      } catch {
        // ignore
      }
    }
  } else {
    try {
      await restartWahaSession(baseUrl, apiKey, sessionName);
    } catch {
      // ignore
    }
  }

  return waitForWahaSessionReady(baseUrl, apiKey, sessionName, {
    attempts: 12,
    delayMs: 1000,
  });
}

/** WAHA API ile bireysel WhatsApp metin mesajı */
export async function sendWahaTextMessage(
  baseUrl: string,
  apiKey: string,
  sessionName: string,
  number: string,
  text: string
) {
  const digits = number.replace(/\D/g, "");
  const chatId = digits.includes("@") ? digits : `${digits}@c.us`;
  return wahaRequest(baseUrl, apiKey, "/api/sendText", {
    method: "POST",
    body: JSON.stringify({
      session: sessionName,
      chatId,
      text,
    }),
  });
}

export async function sendWahaTextMessageWithRecovery(
  baseUrl: string,
  apiKey: string,
  sessionName: string,
  number: string,
  text: string,
  options?: {
    webhookUrl?: string;
    webhookSecret?: string;
  }
) {
  const send = () =>
    sendWahaTextMessage(baseUrl, apiKey, sessionName, number, text);

  try {
    await send();
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!isWahaSessionAvailabilityError(message)) {
      throw error;
    }
  }

  const recovered = await recoverWahaSessionForSend(
    baseUrl,
    apiKey,
    sessionName,
    options?.webhookUrl,
    options?.webhookSecret
  );

  if (!isWahaSessionReady(recovered)) {
    throw new Error(
      translateWahaUserError(
        "Session status is not as expected. Try again later or restart the session"
      )
    );
  }

  await send();
}
