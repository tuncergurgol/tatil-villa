"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { shareNewBookingQuoteWhatsAppAction } from "@/app/actions/admin/new-booking-whatsapp-share";
import TurkishPhoneField, {
  normalizeTurkishPhoneFieldValue,
} from "@/components/admin/ui/TurkishPhoneField";
import type { NewBookingWhatsAppSharePayload } from "@/lib/new-booking-whatsapp-share";

interface NewBookingWhatsAppShareModalProps {
  open: boolean;
  onClose: () => void;
  payload: NewBookingWhatsAppSharePayload | null;
  initialPhone?: string;
}

export default function NewBookingWhatsAppShareModal({
  open,
  onClose,
  payload,
  initialPhone = "",
}: NewBookingWhatsAppShareModalProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setPhone(initialPhone);
    setError(null);
    setSuccess(null);
  }, [open, initialPhone]);

  if (!open || !payload) return null;

  function handleSend() {
    const normalized = normalizeTurkishPhoneFieldValue(phone);
    if (!normalized) {
      setError("WhatsApp numarası gerekli");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await shareNewBookingQuoteWhatsAppAction({
        ...payload!,
        phone: normalized,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? "WhatsApp mesajı gönderildi");
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="inline-flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-bold text-gray-900">
              WhatsApp&apos;a Paylaş
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-gray-600">
            Rezervasyon özeti Bildirim WhatsApp (WAHA) üzerinden müşteriye
            gönderilir.
          </p>
          <TurkishPhoneField
            label="WhatsApp Numarası"
            value={phone}
            onChange={setPhone}
            focusPalette="blue"
            required
          />
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Kapat
          </button>
          <button
            type="button"
            disabled={isPending || Boolean(success)}
            onClick={handleSend}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
