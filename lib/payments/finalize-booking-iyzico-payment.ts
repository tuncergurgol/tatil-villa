import { appendBookingActivityLog } from "@/lib/booking-activity-log";
import { parseBookingDetails, resolveExternalCode } from "@/lib/booking-form-details";
import {
  resolveBookingSiteBrand,
  sanitizePublicBookingDomain,
} from "@/lib/booking-site-brand";
import { normalizeCompanyPaymentType } from "@/lib/company-payment-types";
import { prisma } from "@/lib/db";
import { getActiveIyzicoProvider } from "@/lib/payments/booking-iyzico-checkout";
import { verifyIyzicoCfRetrieveSignature } from "@/lib/payments/iyzico-auth";
import { iyzicoCheckoutFormRetrieve } from "@/lib/payments/iyzico-client";
import { getCompanySettings } from "@/lib/queries/company-settings";

export async function finalizeBookingIyzicoPayment(input: {
  token: string;
  reservationCode: string;
}): Promise<
  | { ok: true; redirectUrl: string }
  | { ok: false; redirectUrl: string; error: string }
> {
  const provider = await getActiveIyzicoProvider();
  const company = await getCompanySettings();

  const numericCode = Number.parseInt(input.reservationCode, 10);
  const booking = await prisma.booking.findFirst({
    where: Number.isFinite(numericCode)
      ? { externalCode: numericCode }
      : { id: input.reservationCode },
    select: {
      id: true,
      externalCode: true,
      guestEmail: true,
      guestName: true,
      details: true,
    },
  });

  const reservationCode =
    booking != null
      ? resolveExternalCode(booking.externalCode, booking.guestEmail) ||
        input.reservationCode
      : input.reservationCode;

  const details = booking ? parseBookingDetails(booking.details) : null;
  const siteBrand = resolveBookingSiteBrand({
    siteInfo: details?.siteInfo,
    originDomain: details?.originDomain,
    company,
  });
  const brandDomain = sanitizePublicBookingDomain(siteBrand.domain);
  const baseReturnUrl = `https://${brandDomain}/odemeyonlendir/${encodeURIComponent(reservationCode)}`;

  if (!provider || !booking) {
    return {
      ok: false,
      redirectUrl: `${baseReturnUrl}?sonuc=basarisiz`,
      error: "Ödeme doğrulanamadı.",
    };
  }

  const session = await prisma.bookingPaymentSession.findFirst({
    where: {
      bookingId: booking.id,
      token: input.token,
    },
    orderBy: { createdAt: "desc" },
  });

  const retrieve = await iyzicoCheckoutFormRetrieve(
    provider.config,
    input.token,
    session?.conversationId
  );

  if (
    retrieve.signature &&
    !verifyIyzicoCfRetrieveSignature(provider.config.secretKey, retrieve)
  ) {
    return {
      ok: false,
      redirectUrl: `${baseReturnUrl}?sonuc=basarisiz`,
      error: "Ödeme imza doğrulaması başarısız.",
    };
  }

  const paymentSuccess =
    retrieve.status === "success" && retrieve.paymentStatus === "SUCCESS";

  if (session) {
    await prisma.bookingPaymentSession.update({
      where: { id: session.id },
      data: {
        status: paymentSuccess ? "success" : "failure",
        paymentId: retrieve.paymentId ?? null,
        paidPrice:
          retrieve.paidPrice != null
            ? Math.round(Number(retrieve.paidPrice))
            : null,
        rawResult: retrieve as object,
      },
    });
  }

  if (!paymentSuccess) {
    return {
      ok: false,
      redirectUrl: `${baseReturnUrl}?sonuc=basarisiz`,
      error:
        retrieve.errorMessage ||
        "Ödeme tamamlanamadı. Lütfen tekrar deneyin veya acentenizle iletişime geçin.",
    };
  }

  const paidAmount = Math.round(
    Number(retrieve.paidPrice ?? session?.amount ?? 0)
  );

  const existing = await prisma.bookingPrepayment.findFirst({
    where: {
      bookingId: booking.id,
      paymentChannel: "credit_card",
      amount: paidAmount,
    },
  });

  if (!existing && paidAmount > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.bookingPrepayment.create({
        data: {
          bookingId: booking.id,
          paymentChannel:
            normalizeCompanyPaymentType("credit_card") || "credit_card",
          amount: paidAmount,
        },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { optionExpiresAt: null },
      });
    });

    await appendBookingActivityLog(booking.id, {
      action: "prepayment_created",
      message: `Kredi kartı ile online ödeme alındı — ${paidAmount.toLocaleString("tr-TR")} TL`,
      actorName: booking.guestName,
      meta: {
        amount: paidAmount,
        paymentId: retrieve.paymentId ?? null,
        provider: "iyzico",
        channel: "credit_card",
      },
    });
  }

  return {
    ok: true,
    redirectUrl: `${baseReturnUrl}?sonuc=basarili&tutar=${paidAmount}`,
  };
}

function buildCallbackRedirectHtml(redirectUrl: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Ödeme sonucu</title>
  <script>
    (function () {
      var target = ${JSON.stringify(redirectUrl)};
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = target;
          return;
        }
      } catch (e) {}
      window.location.href = target;
    })();
  </script>
</head>
<body>
  <p>Ödeme sonucuna yönlendiriliyorsunuz…</p>
  <p><a href="${redirectUrl.replace(/"/g, "&quot;")}">Devam etmek için tıklayın</a></p>
</body>
</html>`;
}

export { buildCallbackRedirectHtml };
