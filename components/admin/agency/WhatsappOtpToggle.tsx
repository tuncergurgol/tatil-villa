"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { setWhatsappOtpEnabledAction } from "@/app/actions/admin/whatsapp-otp";

export default function WhatsappOtpToggle({
  enabled: initialEnabled,
}: {
  enabled: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setError(null);
    startTransition(async () => {
      const result = await setWhatsappOtpEnabledAction(next);
      if (result.error || !result.success) {
        setError(result.error ?? "Ayar kaydedilemedi");
        return;
      }
      setEnabled(Boolean(result.enabled));
      router.refresh();
    });
  }

  return (
    <section
      className={`rounded-2xl border p-5 ${
        enabled
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white"
          : "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <MessageSquare className="h-3.5 w-3.5" />
            WhatsApp doğrulama kodu
          </p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">
            {enabled ? "Aktif" : "Pasif"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {enabled
              ? "Sizi arayalım, üye girişi ve rezervasyon girişi için 5 haneli kod WhatsApp ile gönderilir."
              : "Kod gönderilmez. Telefon doğrulama adımı atlanır; formlar doğrudan tamamlanır. İstediğiniz zaman bu butonla yeniden açabilirsiniz."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${
            enabled
              ? "bg-slate-800 hover:bg-slate-900"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {pending
            ? "Kaydediliyor…"
            : enabled
              ? "WhatsApp OTP'yi kapat"
              : "WhatsApp OTP'yi aç"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
