"use client";

import { useCallback, useEffect, useState } from "react";

type Challenge = {
  question: string;
  token: string;
};

type Props = {
  resetKey?: string | number;
  className?: string;
};

export default function SimpleCaptchaField({
  resetKey = 0,
  className = "",
}: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/captcha", { cache: "no-store" });
      if (!res.ok) throw new Error("captcha");
      const data = (await res.json()) as Challenge;
      if (!data?.question || !data?.token) throw new Error("captcha");
      setChallenge(data);
    } catch {
      setChallenge(null);
      setError("Güvenlik sorusu yüklenemedi. Yenileyin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, resetKey]);

  return (
    <div className={className}>
      <input type="hidden" name="simpleCaptchaToken" value={challenge?.token ?? ""} />
      <label className="block">
        <span className="text-sm font-medium text-[#0f2f3a]">
          Güvenlik doğrulaması
        </span>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <div className="min-w-[7.5rem] rounded-2xl border border-[#1a4a5c]/15 bg-[#f4f8fa] px-4 py-3 text-center text-base font-bold tracking-wide text-[#0f2f3a]">
            {loading ? "…" : challenge?.question || "—"}
          </div>
          <input
            name="simpleCaptchaAnswer"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="Sonuç"
            className="w-28 rounded-2xl border border-[#1a4a5c]/15 bg-white/90 px-4 py-3 text-sm text-[#0f2f3a] shadow-sm outline-none transition placeholder:text-[#1a4a5c]/40 focus:border-[#e85d04] focus:ring-2 focus:ring-[#e85d04]/20"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-[#1a4a5c]/15 px-3 py-2 text-xs font-semibold text-[#1a4a5c]/80 hover:border-[#e85d04]/40 hover:text-[#e85d04]"
          >
            Yenile
          </button>
        </div>
      </label>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-[#1a4a5c]/50">
          Bot koruması için toplamı yazın.
        </p>
      )}
    </div>
  );
}
