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

async function parseEvolutionError(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as { message?: string | string[]; error?: string };
    const message = json.message;
    if (Array.isArray(message)) return message.join(", ");
    return message ?? json.error ?? text ?? `Evolution API hata (${res.status})`;
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

export async function fetchEvolutionInstances(baseUrl: string, apiKey: string) {
  const data = await evolutionRequest<
    EvolutionInstanceInfo[] | { instances?: EvolutionInstanceInfo[] }
  >(baseUrl, apiKey, "/instance/fetchInstances");

  if (Array.isArray(data)) return data;
  return data.instances ?? [];
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
  webhookSecret: string
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
      qrcode: false,
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
    // ignore
  }

  try {
    await deleteEvolutionInstance(baseUrl, apiKey, instanceName);
  } catch {
    // ignore
  }

  await createEvolutionInstance(
    baseUrl,
    apiKey,
    instanceName,
    webhookUrl,
    webhookSecret
  );
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
  const data = await evolutionRequest<
    | Array<Record<string, unknown>>
    | { groups?: Array<Record<string, unknown>> }
  >(
    baseUrl,
    apiKey,
    `/group/fetchAllGroups/${encodeURIComponent(instanceName)}?getParticipants=false`
  );

  const rows = Array.isArray(data) ? data : data.groups ?? [];

  return rows
    .map((row) => {
      const id = String(
        row.id ?? row.jid ?? row.groupJid ?? row.remoteJid ?? ""
      ).trim();
      const name = String(
        row.subject ?? row.name ?? row.groupName ?? row.pushName ?? id
      ).trim();
      if (!id.includes("@g.us")) return null;
      return { id, name: name || id };
    })
    .filter((item): item is EvolutionWhatsappGroup => Boolean(item))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}
