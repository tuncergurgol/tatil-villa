export type EvolutionInstanceState = "open" | "close" | "connecting" | string;

export type EvolutionInstanceInfo = {
  instanceName: string;
  instanceId?: string;
  status?: EvolutionInstanceState;
  state?: EvolutionInstanceState;
  owner?: string;
  profileName?: string;
};

export type EvolutionConnectionState = {
  instance: EvolutionInstanceInfo;
  state?: EvolutionInstanceState;
};

export type EvolutionConnectResponse = {
  pairingCode?: string;
  code?: string;
  base64?: string;
  qrcode?: {
    base64?: string;
    code?: string;
    count?: number;
  };
  instance?: EvolutionInstanceInfo;
};

export type EvolutionCreateResponse = {
  instance?: EvolutionInstanceInfo;
  hash?: string;
  qrcode?: {
    base64?: string;
    code?: string;
  };
};

export type NormalizedEvolutionConnection = {
  status: string;
  pushName: string | null;
  phoneId: string | null;
  rawState: EvolutionInstanceState | null;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, "");
}

function buildHeaders(apiKey: string) {
  return {
    apikey: apiKey,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function evolutionErrorText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => evolutionErrorText(item))
      .filter((item): item is string => Boolean(item));
    return parts.length ? parts.join(", ") : null;
  }
  if (value && typeof value === "object" && "message" in value) {
    return evolutionErrorText((value as { message: unknown }).message);
  }
  return null;
}

async function parseEvolutionError(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as {
      message?: unknown;
      error?: string;
      response?: { message?: unknown };
    };
    return (
      evolutionErrorText(json.message) ??
      evolutionErrorText(json.response?.message) ??
      json.error ??
      text ??
      `Evolution API hata (${res.status})`
    );
  } catch {
    return text || `Evolution API hata (${res.status})`;
  }
}

export async function evolutionRequest<T>(
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
    throw new Error(await parseEvolutionError(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function normalizePhoneNumberForEvolution(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `90${digits.slice(1)}`;
  }
  return digits;
}

export function mapEvolutionStateToStatus(
  state: EvolutionInstanceState | null | undefined,
  owner?: string | null
): string {
  if (owner?.trim()) return "WORKING";
  if (state === "open") return "WORKING";
  if (state === "connecting") return "SCAN_QR_CODE";
  if (state === "close") return "STOPPED";
  return state ? "STARTING" : "STOPPED";
}

export function normalizeEvolutionConnection(
  connection: EvolutionConnectionState | null,
  instance?: EvolutionInstanceInfo | null
): NormalizedEvolutionConnection {
  const info = instance ?? connection?.instance ?? null;
  const rawState = connection?.state ?? info?.state ?? info?.status ?? null;
  const owner = info?.owner?.trim() || null;
  const pushName = info?.profileName?.trim() || null;

  return {
    status: mapEvolutionStateToStatus(rawState, owner),
    pushName,
    phoneId: owner,
    rawState,
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

function readEvolutionString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** Evolution v2 fetchInstances `name` / `ownerJid` / `connectionStatus` döndürür. */
export function normalizeEvolutionInstance(raw: unknown): EvolutionInstanceInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const nested =
    record.instance && typeof record.instance === "object"
      ? (record.instance as Record<string, unknown>)
      : null;
  const source = nested ?? record;
  const instanceName = readEvolutionString(source, ["instanceName", "name"]);
  if (!instanceName) return null;
  const owner = readEvolutionString(source, ["owner", "ownerJid"]);
  const status = readEvolutionString(source, ["status", "connectionStatus", "state"]);
  const instanceId = readEvolutionString(source, ["instanceId", "id"]);
  const profileName = readEvolutionString(source, ["profileName"]);

  return {
    instanceName,
    instanceId: instanceId || undefined,
    status: status || undefined,
    state: readEvolutionString(source, ["state", "connectionStatus", "status"]) || undefined,
    owner: owner || undefined,
    profileName: profileName || undefined,
  };
}

export async function fetchEvolutionInstances(baseUrl: string, apiKey: string) {
  const data = await evolutionRequest<unknown>(
    baseUrl,
    apiKey,
    "/instance/fetchInstances"
  );

  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { instances?: unknown[] }).instances)
      ? (data as { instances: unknown[] }).instances
      : [];

  return rows
    .map((row) => normalizeEvolutionInstance(row))
    .filter((row): row is EvolutionInstanceInfo => row != null);
}

export async function getEvolutionConnectionState(
  baseUrl: string,
  apiKey: string,
  instanceName: string
) {
  try {
    const data = await evolutionRequest<EvolutionConnectionState>(
      baseUrl,
      apiKey,
      `/instance/connectionState/${encodeURIComponent(instanceName)}`
    );
    return normalizeEvolutionConnection(data);
  } catch {
    const instances = await fetchEvolutionInstances(baseUrl, apiKey);
    const found = instances.find((item) => item.instanceName === instanceName);
    if (!found) return null;
    return normalizeEvolutionConnection(null, found);
  }
}

export async function createEvolutionInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string,
  webhookSecret: string,
  options?: { requestQr?: boolean }
) {
  const url = new URL(getDockerReachableWebhookUrl(webhookUrl));
  if (webhookSecret) {
    url.searchParams.set("secret", webhookSecret);
  }

  return evolutionRequest<EvolutionCreateResponse>(baseUrl, apiKey, "/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: options?.requestQr === true,
      groupsIgnore: false,
      alwaysOnline: true,
      readMessages: true,
      readStatus: false,
      webhookUrl: url.toString(),
      webhookByEvents: false,
      webhookBase64: false,
      webhookEvents: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
    }),
  });
}

export async function connectEvolutionInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  phoneNumber?: string
) {
  const query = phoneNumber
    ? `?number=${encodeURIComponent(phoneNumber)}`
    : "";
  return evolutionRequest<EvolutionConnectResponse>(
    baseUrl,
    apiKey,
    `/instance/connect/${encodeURIComponent(instanceName)}${query}`
  );
}

export function extractEvolutionQrDataUrl(response: EvolutionConnectResponse | EvolutionCreateResponse) {
  const base64 =
    response.qrcode?.base64 ??
    ("base64" in response ? response.base64 : undefined);
  if (!base64) return null;
  if (base64.startsWith("data:")) return base64;
  return `data:image/png;base64,${base64}`;
}

export function extractEvolutionPairingCode(response: EvolutionConnectResponse) {
  return response.pairingCode ?? response.code ?? null;
}

export async function setEvolutionWebhook(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string,
  webhookSecret: string
) {
  const url = new URL(getDockerReachableWebhookUrl(webhookUrl));
  if (webhookSecret) {
    url.searchParams.set("secret", webhookSecret);
  }

  return evolutionRequest(
    baseUrl,
    apiKey,
    `/webhook/set/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: url.toString(),
          webhookByEvents: false,
          webhookBase64: false,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
        },
      }),
    }
  );
}

export async function ensureEvolutionInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string,
  webhookSecret: string
) {
  const instances = await fetchEvolutionInstances(baseUrl, apiKey);
  const existing = instances.find((item) => item.instanceName === instanceName);
  if (existing) {
    try {
      await setEvolutionWebhook(
        baseUrl,
        apiKey,
        instanceName,
        webhookUrl,
        webhookSecret
      );
    } catch {
      // Webhook güncellenemese de mevcut instance kullanılabilir.
    }
    return existing;
  }

  const created = await createEvolutionInstance(
    baseUrl,
    apiKey,
    instanceName,
    webhookUrl,
    webhookSecret
  );
  return created.instance ?? { instanceName, status: "close" };
}

export async function logoutEvolutionInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string
) {
  return evolutionRequest(
    baseUrl,
    apiKey,
    `/instance/logout/${encodeURIComponent(instanceName)}`,
    { method: "DELETE" }
  );
}

export async function deleteEvolutionInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string
) {
  return evolutionRequest(
    baseUrl,
    apiKey,
    `/instance/delete/${encodeURIComponent(instanceName)}`,
    { method: "DELETE" }
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function evolutionInstanceExists(
  baseUrl: string,
  apiKey: string,
  instanceName: string
) {
  const instances = await fetchEvolutionInstances(baseUrl, apiKey);
  return instances.some((item) => item.instanceName === instanceName);
}

/**
 * Evolution delete, kaydı silen olayı beklemeden 200 döner.
 * Hemen create atılırsa aynı ad "already in use" yüzünden 403 Forbidden olur.
 */
async function waitUntilEvolutionInstanceGone(
  baseUrl: string,
  apiKey: string,
  instanceName: string
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (!(await evolutionInstanceExists(baseUrl, apiKey, instanceName))) {
      return true;
    }
    await sleep(1000);
  }
  return false;
}

export async function restartEvolutionInstance(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string,
  webhookSecret: string
) {
  try {
    await logoutEvolutionInstance(baseUrl, apiKey, instanceName);
  } catch {
    // Kapalı oturumda logout 400 döner; silmeye devam edilir.
  }

  let deleteError = "";
  try {
    await deleteEvolutionInstance(baseUrl, apiKey, instanceName);
  } catch (error) {
    deleteError = error instanceof Error ? error.message : "oturum silinemedi";
  }

  let gone = await waitUntilEvolutionInstanceGone(baseUrl, apiKey, instanceName);
  if (!gone) {
    try {
      await deleteEvolutionInstance(baseUrl, apiKey, instanceName);
      deleteError = "";
    } catch (error) {
      deleteError = error instanceof Error ? error.message : deleteError;
    }
    gone = await waitUntilEvolutionInstanceGone(baseUrl, apiKey, instanceName);
  }

  if (!gone) {
    const detail = deleteError ? ` Evolution: ${deleteError}` : "";
    throw new Error(
      `Eski WhatsApp oturumu silinemediği için yeni QR alınamadı.${detail}`
    );
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const created = await createEvolutionInstance(
        baseUrl,
        apiKey,
        instanceName,
        webhookUrl,
        webhookSecret,
        { requestQr: true }
      );
      try {
        await setEvolutionWebhook(
          baseUrl,
          apiKey,
          instanceName,
          webhookUrl,
          webhookSecret
        );
      } catch {
        // QR alındıysa webhook sonra da yazılabilir.
      }
      return created;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      const nameTaken =
        message.includes("already in use") || message === "forbidden";
      if (!nameTaken || attempt === 3) break;
      await sleep(1500);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "oturum oluşturulamadı";
  throw new Error(`Yeni QR alınamadı. ${message}`);
}

export type EvolutionWhatsappGroup = {
  id: string;
  name: string;
};

export async function fetchEvolutionWhatsappGroups(
  baseUrl: string,
  apiKey: string,
  instanceName: string
): Promise<EvolutionWhatsappGroup[]> {
  // Not: `/group/fetchAllGroups` WhatsApp'tan canlı meta veri çektiği için
  // yüzlerce grupta dakikalarca sürebilir ve proxy zaman aşımına yol açar.
  // Bunun yerine Evolution'ın kendi veritabanından okuyan hızlı `/chat/findChats`
  // ucunu kullanıp grup sohbetlerini süzüyoruz.
  const data = await evolutionRequest<
    Array<Record<string, unknown>> | { chats?: Array<Record<string, unknown>> }
  >(baseUrl, apiKey, `/chat/findChats/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  const rows = Array.isArray(data) ? data : data.chats ?? [];
  const byId = new Map<string, string>();

  for (const row of rows) {
    const id = String(
      row.remoteJid ?? row.id ?? row.jid ?? row.groupJid ?? ""
    ).trim();
    if (!id.includes("@g.us")) continue;
    const name = String(
      row.pushName ?? row.subject ?? row.name ?? row.groupName ?? id
    ).trim();
    if (!byId.has(id)) byId.set(id, name || id);
  }

  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

/** Evolution API ile bireysel WhatsApp metin mesajı */
export async function sendEvolutionTextMessage(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  number: string,
  text: string
) {
  const digits = number.replace(/\D/g, "");
  return evolutionRequest(
    baseUrl,
    apiKey,
    `/message/sendText/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      body: JSON.stringify({
        number: digits,
        text,
      }),
    }
  );
}
