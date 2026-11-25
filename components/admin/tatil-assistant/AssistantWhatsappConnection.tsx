"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  disconnectAssistantWahaAction,
  saveAssistantWahaConnectionSettings,
  type AssistantWahaConnectionState,
} from "@/app/actions/admin/tatil-assistant";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100";

const STATUS_LABELS: Record<string, string> = {
  STOPPED: "Durduruldu",
  STARTING: "Başlatılıyor",
  SCAN_QR_CODE: "QR bekleniyor",
  WORKING: "Bağlı",
  FAILED: "Hata",
};

function statusBadgeClass(status: string | null) {
  if (status === "WORKING") return "bg-emerald-100 text-emerald-800";
  if (status === "SCAN_QR_CODE" || status === "STARTING") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "FAILED") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

async function fetchStatus(includeQr: boolean): Promise<AssistantWahaConnectionState> {
  const res = await fetch(
    `/api/admin/assistant-waha/status?qr=${includeQr ? "1" : "0"}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Durum alınamadı");
  return (await res.json()) as AssistantWahaConnectionState;
}

async function postAction(
  action: string,
  extra: Record<string, string> = {}
): Promise<AssistantWahaConnectionState> {
  const res = await fetch("/api/admin/assistant-waha/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  if (!res.ok) throw new Error("İstek başarısız");
  return (await res.json()) as AssistantWahaConnectionState;
}

type AssistantWhatsappConnectionProps = {
  assistantWahaBaseUrl: string;
  assistantWahaApiKey: string;
  assistantWahaSessionName: string;
  webhookUrl: string;
  defaultPairingPhone: string;
};

export default function AssistantWhatsappConnection({
  assistantWahaBaseUrl,
  assistantWahaApiKey,
  assistantWahaSessionName,
  webhookUrl,
  defaultPairingPhone,
}: AssistantWhatsappConnectionProps) {
  const [baseUrl, setBaseUrl] = useState(assistantWahaBaseUrl);
  const [apiKey, setApiKey] = useState(assistantWahaApiKey);
  const [sessionName, setSessionName] = useState(assistantWahaSessionName);
  const [pairingPhone, setPairingPhone] = useState(defaultPairingPhone);
  const [testPhone, setTestPhone] = useState(defaultPairingPhone);
  const [testText, setTestText] = useState(
    "Merhaba! Tatil Asistanı WhatsApp hattı test mesajı 🐝"
  );
  const [state, setState] = useState<AssistantWahaConnectionState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async (includeQr = false) => {
    try {
      const next = await fetchStatus(includeQr);
      setState(next);
      setError(next.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum alınamadı");
    }
  }, []);

  useEffect(() => {
    void refresh(true);
    pollRef.current = setInterval(() => void refresh(true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  const saveSettings = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("assistantWahaBaseUrl", baseUrl);
      formData.set("assistantWahaApiKey", apiKey);
      formData.set("assistantWahaSessionName", sessionName);
      const result = await saveAssistantWahaConnectionSettings({}, formData);
      setMessage(result.message ?? null);
      setError(result.error ?? null);
      await refresh(true);
    });
  };

  const startSession = (action: "start" | "retry" | "force-restart") => {
    startTransition(async () => {
      try {
        const next = await postAction(action, { webhookUrl });
        setState(next);
        setError(next.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Başlatılamadı");
      }
    });
  };

  const requestPairing = () => {
    startTransition(async () => {
      try {
        const next = await postAction("request-pairing-code", {
          webhookUrl,
          phoneNumber: pairingPhone,
        });
        setState(next);
        setError(next.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kod alınamadı");
      }
    });
  };

  const sendTest = () => {
    startTransition(async () => {
      try {
        const next = await postAction("send-test", {
          phoneNumber: testPhone,
          text: testText,
        });
        setState(next);
        setError(next.error);
        if (!next.error) setMessage("Test mesajı gönderildi");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gönderilemedi");
      }
    });
  };

  const disconnect = () => {
    startTransition(async () => {
      const next = await disconnectAssistantWahaAction();
      setState(next);
      setError(next.error);
    });
  };

  return (
    <div className="space-y-5 rounded-2xl border border-amber-100 bg-white p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(state?.status ?? null)}`}
        >
          {STATUS_LABELS[state?.status ?? ""] ?? state?.status ?? "Bilinmiyor"}
        </span>
        {state?.pushName ? (
          <span className="text-sm text-gray-600">{state.pushName}</span>
        ) : null}
        <span className="text-xs text-gray-500">+90 549 618 01 08</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">WAHA sunucu</span>
          <input
            className={inputClass}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">Oturum adı</span>
          <input
            className={inputClass}
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5 md:col-span-2">
          <span className="text-sm font-medium text-gray-700">API anahtarı</span>
          <input
            type="password"
            className={inputClass}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveSettings}
          disabled={isPending}
          className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          Ayarları kaydet
        </button>
        <button
          type="button"
          onClick={() => startSession("start")}
          disabled={isPending}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Bağlan / QR
        </button>
        <button
          type="button"
          onClick={() => startSession("force-restart")}
          disabled={isPending}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Yeniden başlat
        </button>
        <button
          type="button"
          onClick={disconnect}
          disabled={isPending}
          className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Bağlantıyı kes
        </button>
      </div>

      {state?.qrDataUrl ? (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-4 text-center">
          <p className="mb-3 text-sm font-medium text-amber-900">
            WhatsApp → Bağlı Cihazlar → QR ile bağlan
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.qrDataUrl}
            alt="WhatsApp QR"
            className="mx-auto max-h-64 rounded-lg border border-white shadow"
          />
        </div>
      ) : null}

      {state?.pairingCode ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Eşleştirme kodu:{" "}
          <strong className="text-lg tracking-widest">{state.pairingCode}</strong>
        </p>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <input
            className={inputClass}
            value={pairingPhone}
            onChange={(e) => setPairingPhone(e.target.value)}
            placeholder="905496180108"
          />
          <button
            type="button"
            onClick={requestPairing}
            disabled={isPending}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Telefon kodu ile bağlan
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Webhook: <code className="break-all">{webhookUrl}</code>
        </p>
      </div>

      {state?.status === "WORKING" ? (
        <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <p className="text-sm font-semibold text-emerald-900">Test mesajı</p>
          <input
            className={inputClass}
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
          />
          <textarea
            className={inputClass}
            rows={2}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Test gönder
          </button>
        </div>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
