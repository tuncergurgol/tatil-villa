"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

type IyzicoCheckoutPopupProps = {
  reservationCode: string;
  disabled?: boolean;
  onError?: (message: string) => void;
};

function decodeCheckoutFormContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("<")) return trimmed;
  try {
    return atob(trimmed);
  } catch {
    return trimmed;
  }
}

function injectCheckoutFormContent(content: string) {
  const container = document.getElementById("iyzipay-checkout-form");
  if (!container) return;

  const decoded = decodeCheckoutFormContent(content);

  const template = document.createElement("template");
  template.innerHTML = decoded;

  template.content.querySelectorAll("script").forEach((script) => {
    const el = document.createElement("script");
    if (script.src) {
      el.src = script.src;
      el.async = true;
    } else {
      el.text = script.textContent ?? "";
    }
    document.body.appendChild(el);
  });
}

export default function IyzicoCheckoutPopup({
  reservationCode,
  disabled = false,
  onError,
}: IyzicoCheckoutPopupProps) {
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);

  const startCheckout = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/payments/iyzico/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: reservationCode }),
      });
      const data = (await response.json()) as {
        checkoutFormContent?: string;
        error?: string;
      };

      if (!response.ok || !data.checkoutFormContent) {
        const message = data.error || "Ödeme ekranı açılamadı.";
        onError?.(message);
        return;
      }

      injectCheckoutFormContent(data.checkoutFormContent);
    } catch {
      onError?.("Ödeme ekranı açılırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (disabled || startedRef.current) return;
    startedRef.current = true;
    void startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, reservationCode]);

  return (
    <>
      <div id="iyzipay-checkout-form" className="popup" />
      {loading ? (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          iyzico ödeme ekranı açılıyor…
        </div>
      ) : disabled ? null : (
        <button
          type="button"
          onClick={() => void startCheckout()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <CreditCard className="h-4 w-4" />
          Ödemeyi Tekrar Dene
        </button>
      )}
    </>
  );
}
