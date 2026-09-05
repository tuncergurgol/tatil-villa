"use client";

import { Phone, MessageCircle } from "lucide-react";
import { normalizePhoneToE164, toWhatsAppRecipient } from "@/lib/phone";

interface CheckInContactActionsProps {
  phone: string | null;
  enabled: boolean;
  whatsappPrefill?: string;
}

export default function CheckInContactActions({
  phone,
  enabled,
  whatsappPrefill = "Merhaba, rezervasyon giriş bilgileri hakkında yazıyorum.",
}: CheckInContactActionsProps) {
  const e164 = phone ? normalizePhoneToE164(phone) : "";
  const canAct = enabled && Boolean(e164);
  const telHref = canAct ? `tel:${e164}` : undefined;
  const waHref =
    canAct
      ? `https://wa.me/${toWhatsAppRecipient(e164)}?text=${encodeURIComponent(whatsappPrefill)}`
      : undefined;

  const baseClass =
    "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition";
  const activeCall =
    "bg-emerald-600 text-white hover:bg-emerald-700";
  const activeWa =
    "bg-[#25D366] text-white hover:bg-[#1ebe57]";
  const muted =
    "cursor-not-allowed bg-slate-100 text-slate-400";

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {canAct && telHref ? (
        <a href={telHref} className={`${baseClass} ${activeCall}`}>
          <Phone className="h-4 w-4" />
          Ara
        </a>
      ) : (
        <span className={`${baseClass} ${muted}`} title="Girişe 30 saat kala açılır">
          <Phone className="h-4 w-4" />
          Ara
        </span>
      )}
      {canAct && waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseClass} ${activeWa}`}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      ) : (
        <span className={`${baseClass} ${muted}`} title="Girişe 30 saat kala açılır">
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </span>
      )}
    </div>
  );
}
