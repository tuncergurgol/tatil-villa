"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { saveSiteTrackingGapAction } from "@/app/actions/admin/company-settings";
import type { SiteTrackingGapPrompt } from "@/lib/site-tracking-gaps";

export function trackingGapDismissKey(siteKey: string) {
  return `tatildeyiz-tracking-gap:${siteKey}`;
}

export default function SiteTrackingGapModal({
  prompt,
  onClose,
}: {
  prompt: SiteTrackingGapPrompt;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function dismiss() {
    window.sessionStorage.setItem(trackingGapDismissKey(prompt.siteKey), "1");
    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await saveSiteTrackingGapAction(prompt.siteKey, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.sessionStorage.setItem(trackingGapDismissKey(prompt.siteKey), "1");
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {prompt.siteLabel} için eksik analytics bilgileri
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Bu site Analytics &amp; Scripts sekmesine eklendi. Domain:{" "}
              <span className="font-semibold text-gray-800">{prompt.domain}</span>
              . Boş alanları doldurup kaydedin; bilmediğiniz kodları boş bırakabilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {prompt.fields.map((field) => (
            <label key={field.key} className="block">
              <span className="text-xs font-medium text-gray-500">{field.label}</span>
              <input
                name={field.key}
                defaultValue={field.value}
                placeholder={field.placeholder}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Daha sonra
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
