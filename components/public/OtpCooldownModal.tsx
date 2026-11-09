"use client";

type Props = {
  open: boolean;
  onClose: () => void;
  channel?: "sms" | "whatsapp" | null;
};

export default function OtpCooldownModal({ open, onClose, channel }: Props) {
  if (!open) return null;

  const title =
    channel === "sms"
      ? "SMS ile gönderilen doğrulama kodunu kullanın"
      : "WhatsApp'a gönderilen doğrulama kodunu kullanın";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-cooldown-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            />
          </svg>
        </div>
        <h2
          id="otp-cooldown-title"
          className="text-center text-lg font-bold tracking-tight text-slate-900"
        >
          {title}
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">
          Aynı numaraya yeni kod 10 dakika boyunca gönderilmez. Gelen 5 haneli
          kodu girerek devam edebilirsiniz.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          KAPAT
        </button>
      </div>
    </div>
  );
}
