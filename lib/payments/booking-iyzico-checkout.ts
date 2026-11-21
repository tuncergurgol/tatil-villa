import { prisma } from "@/lib/db";
import {
  parseFieldDefs,
  type PaymentProviderFieldDef,
} from "@/lib/queries/payment-providers";
import {
  formatIyzicoPrice,
  iyzicoCheckoutFormInitialize,
  resolveIyzicoBaseUrl,
  type IyzicoConfig,
} from "@/lib/payments/iyzico-client";

export async function testIyzicoProviderConnection(
  provider: ResolvedIyzicoProvider,
  callbackOrigin: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await iyzicoCheckoutFormInitialize(provider.config, {
      conversationId: `test-${Date.now()}`,
      price: "1.00",
      paidPrice: "1.00",
      basketId: "test-basket",
      callbackUrl: `${callbackOrigin.replace(/\/+$/, "")}/api/payments/iyzico/callback?code=test`,
      buyer: {
        id: "test-buyer",
        name: "Test",
        surname: "Kullanici",
        identityNumber: "11111111111",
        email: "test@example.com",
        gsmNumber: "+905555555555",
        registrationAddress: "Türkiye",
        city: "Istanbul",
        country: "Turkey",
        ip: "85.34.78.112",
      },
      billingAddress: {
        contactName: "Test Kullanici",
        city: "Istanbul",
        country: "Turkey",
        address: "Türkiye",
      },
      basketItems: [
        {
          id: "test-item",
          name: "iyzico baglanti testi",
          category1: "Konaklama",
          itemType: "VIRTUAL",
          price: "1.00",
        },
      ],
    });

    if (result.status === "success" && result.token) {
      return {
        ok: true,
        message: `iyzico bağlantısı başarılı (${provider.mode === "live" ? "Canlı" : "Test"}).`,
      };
    }

    return {
      ok: false,
      message:
        result.errorMessage ||
        result.errorCode ||
        "iyzico test isteği başarısız oldu. API anahtarlarını ve modu kontrol edin.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "iyzico test isteği sırasında hata oluştu.",
    };
  }
}

export type ResolvedIyzicoProvider = {
  id: string;
  slug: string;
  name: string;
  mode: string;
  config: IyzicoConfig;
};

function parseCredentials(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export async function getActiveIyzicoProvider(): Promise<ResolvedIyzicoProvider | null> {
  const provider = await prisma.paymentProvider.findFirst({
    where: {
      active: true,
      slug: "iyzico",
    },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
  });

  if (!provider) {
    const fallback = await prisma.paymentProvider.findFirst({
      where: { active: true, isDefault: true },
      orderBy: [{ sortOrder: "asc" }],
    });
    if (!fallback || fallback.slug !== "iyzico") return null;
    return mapProvider(fallback);
  }

  return mapProvider(provider);
}

function resolveCredentialValue(
  credentials: Record<string, string>,
  fieldDefs: PaymentProviderFieldDef[],
  kind: "api" | "secret"
): string {
  const directKeys =
    kind === "api"
      ? ["apiKey", "APIKey", "api_key", "apikey", "publicKey", "public_key"]
      : ["secretKey", "SecretKey", "secret_key", "secretkey", "privateKey", "private_key"];

  for (const key of directKeys) {
    const value = credentials[key]?.trim();
    if (value) return value;
  }

  for (const field of fieldDefs) {
    const haystack = `${field.key} ${field.label}`.toLowerCase();
    const matches =
      kind === "api"
        ? /api|anahtar|key|public/.test(haystack) &&
          !/secret|güvenlik|guvenlik|private/.test(haystack)
        : /secret|güvenlik|guvenlik|private/.test(haystack);

    if (matches) {
      const value = credentials[field.key]?.trim();
      if (value) return value;
    }
  }

  const orderedValues = fieldDefs
    .map((field) => credentials[field.key]?.trim() || "")
    .filter(Boolean);
  if (kind === "api") return orderedValues[0] ?? "";
  return orderedValues[1] ?? orderedValues[0] ?? "";
}

function mapProvider(provider: {
  id: string;
  slug: string;
  name: string;
  mode: string;
  fields: unknown;
  credentials: unknown;
}): ResolvedIyzicoProvider | null {
  const fieldDefs: PaymentProviderFieldDef[] = parseFieldDefs(provider.fields);
  const credentials = parseCredentials(provider.credentials);

  const apiKey = resolveCredentialValue(credentials, fieldDefs, "api");
  const secretKey = resolveCredentialValue(credentials, fieldDefs, "secret");

  if (!apiKey || !secretKey) {
    return null;
  }

  return {
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    mode: provider.mode,
    config: {
      apiKey,
      secretKey,
      baseUrl: resolveIyzicoBaseUrl(provider.mode),
    },
  };
}

export function splitGuestName(fullName: string): {
  name: string;
  surname: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "Misafir", surname: "Misafir" };
  if (parts.length === 1) return { name: parts[0]!, surname: parts[0]! };
  return {
    name: parts.slice(0, -1).join(" "),
    surname: parts[parts.length - 1]!,
  };
}

export function formatIyzicoGsmNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) {
    return `+${digits.slice(0, 12)}`;
  }
  if (digits.length === 10 && digits.startsWith("5")) {
    return `+90${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+90${digits.slice(1)}`;
  }
  return "+905555555555";
}

export function buildBookingPaymentDescription(
  guestName: string,
  reservationCode: string
): string {
  const name = guestName.trim() || "Misafir";
  const code = reservationCode.trim() || "—";
  return `${name} ${code} nolu rezervasyon ödemesi`;
}

export function buildIyzicoCallbackUrl(origin: string, reservationCode: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/api/payments/iyzico/callback?code=${encodeURIComponent(reservationCode)}`;
}

export async function startBookingIyzicoCheckout(input: {
  bookingId: string;
  reservationCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  amount: number;
  callbackOrigin: string;
  clientIp?: string;
}): Promise<
  | {
      ok: true;
      sessionId: string;
      checkoutFormContent: string;
      token: string;
    }
  | { ok: false; error: string }
> {
  const provider = await getActiveIyzicoProvider();
  if (!provider) {
    return {
      ok: false,
      error:
        "iyzico ödeme sağlayıcısı yapılandırılmamış. Admin → Şirket → Ödeme Yönetimi bölümünden API anahtarlarını girin.",
    };
  }

  const amount = Math.round(input.amount);
  if (!(amount > 0)) {
    return { ok: false, error: "Geçerli bir ödeme tutarı bulunamadı." };
  }

  const conversationId = `booking-${input.reservationCode}-${Date.now()}`;
  const description = buildBookingPaymentDescription(
    input.guestName,
    input.reservationCode
  );
  const { name, surname } = splitGuestName(input.guestName);
  const price = formatIyzicoPrice(amount);
  const callbackUrl = buildIyzicoCallbackUrl(
    input.callbackOrigin,
    input.reservationCode
  );

  const session = await prisma.bookingPaymentSession.create({
    data: {
      bookingId: input.bookingId,
      providerSlug: provider.slug,
      conversationId,
      amount,
      description,
      callbackDomain: input.callbackOrigin.replace(/^https?:\/\//i, ""),
      status: "pending",
    },
  });

  let initialize;
  try {
    initialize = await iyzicoCheckoutFormInitialize(provider.config, {
      conversationId,
      price,
      paidPrice: price,
      basketId: `booking-${input.reservationCode}`,
      callbackUrl,
      buyer: {
        id: input.bookingId.slice(0, 50),
        name,
        surname,
        identityNumber: "11111111111",
        email: input.guestEmail.trim() || "misafir@example.com",
        gsmNumber: formatIyzicoGsmNumber(input.guestPhone),
        registrationAddress: "Türkiye",
        city: "Istanbul",
        country: "Turkey",
        ip: input.clientIp || "85.34.78.112",
      },
      billingAddress: {
        contactName: input.guestName.trim() || "Misafir",
        city: "Istanbul",
        country: "Turkey",
        address: "Türkiye",
      },
      basketItems: [
        {
          id: session.id.slice(0, 50),
          name: description.slice(0, 100),
          category1: "Konaklama",
          itemType: "VIRTUAL",
          price,
        },
      ],
    });
  } catch (error) {
    await prisma.bookingPaymentSession.update({
      where: { id: session.id },
      data: {
        status: "failure",
        rawResult: {
          error:
            error instanceof Error ? error.message : "iyzico isteği başarısız",
        },
      },
    });
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "iyzico ödeme oturumu başlatılamadı.",
    };
  }

  if (initialize.status !== "success" || !initialize.token) {
    await prisma.bookingPaymentSession.update({
      where: { id: session.id },
      data: { status: "failure", rawResult: initialize as object },
    });
    return {
      ok: false,
      error:
        initialize.errorMessage ||
        "iyzico ödeme oturumu başlatılamadı. API anahtarlarını kontrol edin.",
    };
  }

  const checkoutFormContent =
    initialize.checkoutFormContent?.trim() ||
    (initialize.paymentPageUrl
      ? `<script>window.location.href=${JSON.stringify(initialize.paymentPageUrl)};</script>`
      : "");

  if (!checkoutFormContent) {
    return {
      ok: false,
      error: "iyzico ödeme formu içeriği alınamadı.",
    };
  }

  await prisma.bookingPaymentSession.update({
    where: { id: session.id },
    data: {
      token: initialize.token,
      rawResult: initialize as object,
    },
  });

  return {
    ok: true,
    sessionId: session.id,
    checkoutFormContent,
    token: initialize.token,
  };
}
