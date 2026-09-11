import { prisma } from "@/lib/db";
import { parseBookingDetails } from "@/lib/booking-form-details";
import {
  getEdmConfig,
  resolveEdmSupplierIdentity,
} from "@/lib/edm/config";
import { withEdmSession, type EdmSoapClient } from "@/lib/edm/client";
import {
  buildCommissionUblInvoice,
  resolveEdmCustomerFromBooking,
} from "@/lib/edm/ubl-commission";
import { getInvoiceBookingInputsByIds } from "@/lib/queries/invoice-report";

export type EdmSendInvoiceItemResult = {
  bookingId: string;
  externalCode: string;
  guestName: string;
  ok: boolean;
  skipped?: boolean;
  dryRun?: boolean;
  eArchive?: boolean;
  profileId?: string;
  uuid?: string;
  invoiceId?: string;
  receiverVkn?: string;
  receiverAlias?: string;
  amount?: number;
  error?: string;
};

function pickReceiverAlias(
  users: Awaited<ReturnType<EdmSoapClient["checkUser"]>>,
  preferEArchive: boolean
) {
  if (preferEArchive || users.length === 0) {
    return { eArchive: true as const, alias: "" };
  }
  const pk = users.find(
    (u) =>
      u.alias &&
      (/^PK$/i.test(u.unit) || (!u.unit && /pk@/i.test(u.alias)))
  );
  if (pk?.alias) {
    return { eArchive: false as const, alias: pk.alias };
  }
  return { eArchive: true as const, alias: "" };
}

function pickSenderGbAlias(
  users: Awaited<ReturnType<EdmSoapClient["checkUser"]>>,
  fallback: string
) {
  if (fallback) {
    const exact = users.find((u) => u.alias === fallback);
    if (exact?.alias) return exact.alias;
  }
  const preferred = users.find((u) =>
    /defaultgb@edmbilisim\.com\.tr$/i.test(u.alias)
  );
  if (preferred?.alias) return preferred.alias;
  const gb = users.find(
    (u) =>
      u.alias &&
      (/^GB$/i.test(u.unit) || /gb@/i.test(u.alias))
  );
  return gb?.alias || fallback;
}

async function persistEdmResult(
  bookingId: string,
  details: ReturnType<typeof parseBookingDetails>,
  payload: Record<string, unknown>
) {
  const previous =
    typeof details.edmInvoice === "object" && details.edmInvoice
      ? details.edmInvoice
      : {};
  const next = {
    ...previous,
    ...payload,
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>;

  // Başarılı/dry-run kayıtta eski hata metnini temizle
  if (payload.status === "SENT" || payload.status === "DRY_RUN") {
    delete next.error;
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      details: {
        ...details,
        edmInvoice: next,
      },
    },
  });
}

export async function testEdmConnection() {
  const config = getEdmConfig();
  if (!config.enabled) {
    return {
      ok: false as const,
      configured: false,
      message: "EDM_ENABLED kapalı.",
      environment: config.environment,
      endpoint: config.endpoint,
    };
  }
  if (!config.username || !config.password) {
    return {
      ok: false as const,
      configured: false,
      message: "EDM kullanıcı bilgileri eksik.",
      environment: config.environment,
      endpoint: config.endpoint,
    };
  }

  return withEdmSession(async (client) => {
    const sessionId = client.getSessionId();
    let counterLeft: number | null = null;
    try {
      counterLeft = await client.checkCounter();
    } catch {
      counterLeft = null;
    }

    let senderAliases: string[] = [];
    try {
      const vkn = config.senderVkn;
      if (vkn) {
        const users = await client.checkUser(vkn);
        senderAliases = users
          .filter((u) => u.alias && /^GB$/i.test(u.unit))
          .map((u) => u.alias);
      }
    } catch {
      senderAliases = [];
    }

    return {
      ok: true as const,
      configured: true,
      message: "EDM oturumu açıldı.",
      environment: config.environment,
      endpoint: config.endpoint,
      sessionId,
      counterLeft,
      dryRun: config.dryRun,
      username: config.username,
      senderVkn: config.senderVkn,
      senderAlias: config.senderAlias,
      senderAliases,
      senderAliasConfigured: Boolean(config.senderAlias),
      invoiceSerial: config.invoiceSerial || null,
    };
  });
}

export async function sendCommissionInvoicesViaEdm(bookingIds: string[]) {
  const config = getEdmConfig();
  const loaded = await getInvoiceBookingInputsByIds(bookingIds);
  const results: EdmSendInvoiceItemResult[] = [];

  if (!loaded.company) {
    return { results, summary: { ok: 0, failed: 0, skipped: 0 } };
  }

  const companyTax = loaded.company.taxNumber.replace(/\D/g, "");
  if (!companyTax && !config.senderVkn) {
    throw new Error("Şirket VKN veya EDM_SENDER_VKN tanımlı değil.");
  }

  const supplier = resolveEdmSupplierIdentity(config, {
    taxNumber: companyTax,
    companyTitle: loaded.company.companyTitle,
    agencyName: loaded.company.agencyName,
  });

  if (!supplier.senderVkn) {
    throw new Error("Gönderici VKN çözülemedi.");
  }

  await withEdmSession(async (client) => {
    let resolvedSenderAlias = config.senderAlias;
    if (!resolvedSenderAlias) {
      try {
        const senderUsers = await client.checkUser(supplier.senderVkn);
        resolvedSenderAlias = pickSenderGbAlias(senderUsers, "");
      } catch {
        resolvedSenderAlias = "";
      }
    } else {
      // Yapılandırılmış alias varsa koru; CheckUser alternatif GB etiketlerini ezmesin
      try {
        const senderUsers = await client.checkUser(supplier.senderVkn);
        const exact = senderUsers.find((u) => u.alias === config.senderAlias);
        if (!exact) {
          const preferred = senderUsers.find((u) =>
            /defaultgb@edmbilisim\.com\.tr$/i.test(u.alias)
          );
          if (preferred?.alias) resolvedSenderAlias = preferred.alias;
        }
      } catch {
        // config alias ile devam
      }
    }
    if (!resolvedSenderAlias) {
      throw new Error(
        "EDM_SENDER_ALIAS tanımlı değil (GİB gönderici birim / GB etiketi)."
      );
    }

    const companyForUbl = {
      taxNumber: supplier.senderVkn,
      title: supplier.title,
      taxOffice: loaded.company!.taxOffice || "KAĞITHANE",
      address: loaded.company!.address,
      mersisNo: loaded.company!.mersisNo,
      tradeRegistryNo: loaded.company!.tradeRegistryNo,
    };

    for (const item of loaded.bookings) {
      const base: EdmSendInvoiceItemResult = {
        bookingId: item.record.id,
        externalCode: item.input.externalCode,
        guestName: item.input.guestName,
        ok: false,
      };

      if (item.missing.length > 0) {
        results.push({
          ...base,
          skipped: true,
          error: `Eksik alanlar: ${item.missing.join(", ")}`,
        });
        continue;
      }

      const details = parseBookingDetails(item.record.details);
      const existing = details.edmInvoice as
        | { uuid?: string; status?: string }
        | undefined;
      if (existing?.uuid && existing.status === "SENT") {
        results.push({
          ...base,
          skipped: true,
          uuid: existing.uuid,
          error: "Bu rezervasyon için EDM faturası zaten gönderilmiş.",
        });
        continue;
      }

      try {
        // Önce alıcı tipini belirle (e-arşiv / e-fatura), sonra seri no üret
        let eArchive = true;
        let receiverAlias = "";
        const receiverProbe = resolveEdmCustomerFromBooking(item.input);
        try {
          const users = await client.checkUser(receiverProbe.taxNumber);
          const decision = pickReceiverAlias(users, false);
          eArchive = decision.eArchive;
          receiverAlias = decision.alias;
        } catch {
          eArchive = true;
          receiverAlias = "";
        }

        const allocated = await client.allocateInvoiceId(
          config.invoiceSerial || undefined,
          eArchive
        );

        const ubl = buildCommissionUblInvoice({
          booking: item.input,
          company: companyForUbl,
          config,
          eArchive,
          invoiceId: allocated.invoiceId,
        });

        if (config.dryRun) {
          await persistEdmResult(item.record.id, details, {
            status: "DRY_RUN",
            uuid: ubl.uuid,
            invoiceId: allocated.invoiceId,
            eArchive,
            profileId: ubl.profileId,
            senderVkn: supplier.senderVkn,
            senderAlias: resolvedSenderAlias,
            receiverVkn: ubl.receiverVkn,
            receiverAlias,
            amount: ubl.gross,
          });
          results.push({
            ...base,
            ok: true,
            dryRun: true,
            eArchive,
            profileId: ubl.profileId,
            uuid: ubl.uuid,
            invoiceId: allocated.invoiceId,
            receiverVkn: ubl.receiverVkn,
            receiverAlias,
            amount: ubl.gross,
          });
          continue;
        }

        const sent = await client.sendInvoice({
          senderVkn: supplier.senderVkn,
          senderAlias: resolvedSenderAlias,
          receiverVkn: ubl.receiverVkn,
          receiverAlias,
          eArchive,
          invoiceSerial: allocated.serial,
          invoiceId: allocated.invoiceId,
          uuid: ubl.uuid,
          ublXml: ubl.xml,
        });

        await persistEdmResult(item.record.id, details, {
          status: "SENT",
          uuid: sent.uuid,
          invoiceId: sent.id,
          eArchive,
          profileId: ubl.profileId,
          senderVkn: supplier.senderVkn,
          senderAlias: resolvedSenderAlias,
          receiverVkn: ubl.receiverVkn,
          receiverAlias,
          amount: ubl.gross,
          sentAt: new Date().toISOString(),
        });

        results.push({
          ...base,
          ok: true,
          eArchive,
          profileId: ubl.profileId,
          uuid: sent.uuid,
          invoiceId: sent.id,
          receiverVkn: ubl.receiverVkn,
          receiverAlias,
          amount: ubl.gross,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "EDM gönderim hatası";
        await persistEdmResult(item.record.id, details, {
          status: "ERROR",
          error: message,
        }).catch(() => undefined);
        results.push({ ...base, ok: false, error: message });
      }
    }
  });

  const summary = {
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
  };

  return { results, summary };
}
