"use client";

import { useState } from "react";

type PhoneOption = { key: string; phone: string };

type Props = {
  identityNumber: string;
  integrationCode: string;
  onVerified: () => void;
};

async function findeksRequest(
  action: string,
  body: Record<string, string>
): Promise<unknown> {
  const res = await fetch(`/api/yolcu360/findeks?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Findeks işlemi başarısız"
    );
  }
  return data;
}

export default function Yolcu360FindeksWizard({
  identityNumber,
  integrationCode,
  onVerified,
}: Props) {
  const [step, setStep] = useState<"check" | "phone" | "pin" | "done">("check");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phones, setPhones] = useState<PhoneOption[]>([]);
  const [selectedPhoneKey, setSelectedPhoneKey] = useState("");
  const [findeksCode, setFindeksCode] = useState("");
  const [pinCode, setPinCode] = useState("");

  async function runCheck() {
    setLoading(true);
    setError(null);
    try {
      const data = (await findeksRequest("check", {
        identityNumber,
        integrationCode,
      })) as { status?: string };

      if (data.status === "Positive") {
        setStep("done");
        onVerified();
        return;
      }

      const phoneData = (await findeksRequest("phone-list", {
        identityNumber,
        integrationCode,
      })) as { phoneList?: PhoneOption[] };

      const list = phoneData.phoneList ?? [];
      if (list.length === 0) {
        throw new Error("Kayıtlı telefon numarası bulunamadı.");
      }

      setPhones(list);
      setSelectedPhoneKey(list[0]?.key ?? "");
      setStep("phone");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Findeks kontrolü başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function requestPin() {
    if (!selectedPhoneKey) return;
    setLoading(true);
    setError(null);
    try {
      const data = (await findeksRequest("report", {
        identityNumber,
        integrationCode,
        phoneKey: selectedPhoneKey,
      })) as { findeksCode?: string };

      if (!data.findeksCode) {
        throw new Error("Findeks kodu alınamadı.");
      }

      setFindeksCode(data.findeksCode);
      setStep("pin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "SMS gönderilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function confirmPin() {
    if (!findeksCode || !pinCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await findeksRequest("pin-confirm", {
        findeksCode,
        pinCode: pinCode.trim(),
        integrationCode,
      });
      setStep("done");
      onVerified();
    } catch (e) {
      setError(e instanceof Error ? e.message : "PIN doğrulanamadı");
    } finally {
      setLoading(false);
    }
  }

  async function renewPin() {
    if (!findeksCode) return;
    setLoading(true);
    setError(null);
    try {
      await findeksRequest("pin-renew", { findeksCode, integrationCode });
      setPinCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "PIN yenilenemedi");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Findeks doğrulaması tamamlandı.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <h2 className="text-lg font-bold text-amber-900">Findeks doğrulaması</h2>
      <p className="mt-1 text-sm text-amber-800/90">
        Bu araç için kredi notu kontrolü gereklidir. Rezervasyona devam etmeden önce
        doğrulamayı tamamlayın.
      </p>

      {step === "check" ? (
        <button
          type="button"
          disabled={loading || identityNumber.length < 11}
          onClick={() => void runCheck()}
          className="mt-4 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {loading ? "Kontrol ediliyor…" : "Findeks kontrolünü başlat"}
        </button>
      ) : null}

      {step === "phone" ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-amber-900">
              SMS gönderilecek telefon
            </span>
            <select
              value={selectedPhoneKey}
              onChange={(e) => setSelectedPhoneKey(e.target.value)}
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm"
            >
              {phones.map((phone) => (
                <option key={phone.key} value={phone.key}>
                  {phone.phone}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void requestPin()}
            className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {loading ? "Gönderiliyor…" : "SMS ile PIN gönder"}
          </button>
        </div>
      ) : null}

      {step === "pin" ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-amber-900">
              SMS ile gelen PIN
            </span>
            <input
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="PIN kodu"
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || !pinCode.trim()}
              onClick={() => void confirmPin()}
              className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {loading ? "Doğrulanıyor…" : "PIN doğrula"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void renewPin()}
              className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-60"
            >
              PIN yeniden gönder
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
