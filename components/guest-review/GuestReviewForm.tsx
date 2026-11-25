"use client";

import { useActionState, useState } from "react";
import {
  submitGuestReviewAction,
  type GuestReviewSubmitState,
} from "@/app/actions/guest-review";

const initialState: GuestReviewSubmitState = {};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

type Props = {
  token: string;
  guestName: string;
  villaName: string;
  googleReviewUrl?: string;
};

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Puanınız">
      {Array.from({ length: 5 }).map((_, index) => {
        const star = index + 1;
        const active = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className={`text-3xl transition ${
              active ? "text-amber-400" : "text-slate-300"
            }`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export default function GuestReviewForm({
  token,
  guestName,
  villaName,
  googleReviewUrl = "",
}: Props) {
  const [rating, setRating] = useState(5);
  const [state, formAction, pending] = useActionState(
    submitGuestReviewAction,
    initialState
  );

  if (state.success) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          Teşekkür ederiz!
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Yorumunuz alındı. İnceleme sonrası web sitemizde yayınlanacaktır.
        </p>
        {googleReviewUrl ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              Bize Google üzerinden de 1 dakikanızı ayırarak destek olmak
              ister misiniz?
            </p>
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Google&apos;da Paylaş
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="rating" value={rating} />

      <p className="text-sm text-slate-500">Merhaba {guestName},</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">
        {villaName} konaklamanızı değerlendirin
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Deneyiminizi paylaşın; yorumunuz onay sonrası yayınlanır.
      </p>

      {state.error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="mt-6">
        <label className="text-sm font-medium text-slate-700">Puanınız</label>
        <div className="mt-2">
          <StarPicker value={rating} onChange={setRating} />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="title" className="text-sm font-medium text-slate-700">
          Başlık (isteğe bağlı)
        </label>
        <input
          id="title"
          name="title"
          maxLength={120}
          placeholder="Kısa bir başlık"
          className={fieldClass}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="comment" className="text-sm font-medium text-slate-700">
          Yorumunuz
        </label>
        <textarea
          id="comment"
          name="comment"
          required
          minLength={20}
          maxLength={4000}
          rows={5}
          placeholder="Konaklamanızı birkaç cümleyle anlatın..."
          className={fieldClass}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="guestCity" className="text-sm font-medium text-slate-700">
          Şehir (isteğe bağlı)
        </label>
        <input
          id="guestCity"
          name="guestCity"
          maxLength={80}
          placeholder="örn. İstanbul"
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {pending ? "Gönderiliyor…" : "Yorumu Gönder"}
      </button>
    </form>
  );
}
