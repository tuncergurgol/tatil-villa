import {
  isValidWhatsAppPhoneE164,
  normalizePhoneToE164,
} from "@/lib/phone";

export type SmsSendResult = {
  ok: boolean;
  provider: "netgsm" | "stub";
  detail?: string;
  messageId?: string;
};

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

/** Netgsm (veya eşdeğer) kimlik bilgileri tanımlı mı? */
export function isSmsProviderConfigured(): boolean {
  const provider = (env("SMS_PROVIDER") || "netgsm").toLowerCase();
  if (provider === "stub" || provider === "none" || provider === "off") {
    return false;
  }
  if (provider === "netgsm") {
    return Boolean(env("NETGSM_USERCODE") && env("NETGSM_PASSWORD") && env("NETGSM_MSGHEADER"));
  }
  return false;
}

function toNetgsmGsm(phoneE164: string): string {
  // Netgsm: 5XXXXXXXXX veya 905XXXXXXXXX
  const digits = phoneE164.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `90${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  return digits;
}

async function sendViaNetgsm(params: {
  phoneE164: string;
  message: string;
}): Promise<SmsSendResult> {
  const usercode = env("NETGSM_USERCODE");
  const password = env("NETGSM_PASSWORD");
  const msgheader = env("NETGSM_MSGHEADER");
  if (!usercode || !password || !msgheader) {
    return {
      ok: false,
      provider: "netgsm",
      detail: "Netgsm ayarları eksik (NETGSM_USERCODE / PASSWORD / MSGHEADER)",
    };
  }

  const gsmno = toNetgsmGsm(params.phoneE164);
  const url = new URL("https://api.netgsm.com.tr/sms/send/get");
  url.searchParams.set("usercode", usercode);
  url.searchParams.set("password", password);
  url.searchParams.set("gsmno", gsmno);
  url.searchParams.set("message", params.message);
  url.searchParams.set("msgheader", msgheader);
  url.searchParams.set("dil", "TR");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });
    const text = (await response.text()).trim();
    // Başarı: "00 <jobid>" veya "00\n<jobid>"
    const code = text.split(/\s+/)[0] ?? "";
    if (code === "00") {
      const messageId = text.split(/\s+/).slice(1).join(" ").trim() || undefined;
      return { ok: true, provider: "netgsm", messageId };
    }
    return {
      ok: false,
      provider: "netgsm",
      detail: `Netgsm hata kodu: ${text || response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "netgsm",
      detail:
        error instanceof Error ? error.message : "Netgsm isteği başarısız",
    };
  }
}

/**
 * Transactional SMS gönderimi.
 * Sağlayıcı: SMS_PROVIDER=netgsm (varsayılan) + NETGSM_* env.
 */
export async function sendSmsMessage(params: {
  phone: string;
  message: string;
  purpose?: string;
}): Promise<SmsSendResult> {
  const e164 = normalizePhoneToE164(params.phone);
  if (!e164 || !isValidWhatsAppPhoneE164(e164)) {
    return {
      ok: false,
      provider: isSmsProviderConfigured() ? "netgsm" : "stub",
      detail: "Geçerli bir telefon numarası girin",
    };
  }

  const message = params.message.trim();
  if (!message) {
    return {
      ok: false,
      provider: isSmsProviderConfigured() ? "netgsm" : "stub",
      detail: "SMS metni boş",
    };
  }

  if (!isSmsProviderConfigured()) {
    console.info("[sms] provider yok — gönderilmedi", {
      purpose: params.purpose,
      phone: e164,
      preview: message.slice(0, 80),
    });
    return {
      ok: false,
      provider: "stub",
      detail:
        "SMS sağlayıcısı yapılandırılmadı. .env içine NETGSM_USERCODE, NETGSM_PASSWORD, NETGSM_MSGHEADER ekleyin.",
    };
  }

  const provider = (env("SMS_PROVIDER") || "netgsm").toLowerCase();
  if (provider === "netgsm") {
    return sendViaNetgsm({ phoneE164: e164, message });
  }

  return {
    ok: false,
    provider: "stub",
    detail: `Desteklenmeyen SMS_PROVIDER: ${provider}`,
  };
}
