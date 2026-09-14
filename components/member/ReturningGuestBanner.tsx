"use client";

import type { ReturningGuestPreview } from "@/lib/returning-guest-shared";

export default function ReturningGuestBanner({
  match,
  title,
  body,
  variant = "public",
  discountApplied = false,
}: {
  match?: ReturningGuestPreview | null;
  title?: string;
  body?: string;
  variant?: "public" | "admin";
  discountApplied?: boolean;
}) {
  const welcomeTitle = match?.welcomeTitle ?? title;
  const welcomeBody = match?.welcomeBody ?? body;
  if (!welcomeTitle && !welcomeBody) return null;

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-teal-900">
      {welcomeTitle ? (
        <p className="text-sm font-bold sm:text-base">{welcomeTitle}</p>
      ) : null}
      {welcomeBody ? (
        <p className="mt-1 text-sm leading-relaxed text-teal-800">{welcomeBody}</p>
      ) : null}
      {variant === "admin" && match?.applyDiscount ? (
        <p className="mt-1.5 text-xs font-semibold text-teal-700">
          {discountApplied
            ? `Acente indirimi %${match.discountPercent} olarak güncellendi.`
            : `Sadakat indirimi %${match.discountPercent}. Mevcut acente oranı daha düşükse kayıtta otomatik yükseltilir.`}
        </p>
      ) : null}
      {variant === "public" && match?.applyDiscount && !match.hasMemberAccount ? (
        <p className="mt-1.5 text-xs font-medium text-teal-700">
          Üye girişi yaptığınızda bu indirim rezervasyonunuza uygulanır.
        </p>
      ) : null}
    </div>
  );
}
