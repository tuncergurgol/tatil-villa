"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  disconnectEvolutionAction,
  saveEvolutionConnectionSettings,
  type EvolutionConnectionState,
} from "@/app/actions/admin/evolution-connection";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100";

function isPlaceholderApiKey(value: string) {
  const trimmed = value.trim().toLowerCase();
  return (
    !trimmed ||
    trimmed.includes("authentication_api_key") ||
    trimmed.includes("evolution/.env")
  );
}

async function saveSettingsToServer(
  baseUrl: string,
  apiKey: string,
  instanceName: string
) {
  const formData = new FormData();
  formData.set("evolutionBaseUrl", baseUrl);
  formData.set("evolutionApiKey", apiKey);
  formData.set("evolutionInstanceName", instanceName);
  return saveEvolutionConnectionSettings({}, formData);
}

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

async function fetchEvolutionStatus(includeQr: boolean): Promise<EvolutionConnectionState> {
  const res = await fetch(`/api/admin/evolution/status?qr=${includeQr ? "1" : "0"}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Durum alınamadı");
  }
  return (await res.json()) as EvolutionConnectionState;
}

async function postEvolutionAction(
  action: "start" | "retry" | "force-restart",
  webhookUrl: string
): Promise<EvolutionConnectionState> {
  const res = await fetch("/api/admin/evolution/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, webhookUrl }),
  });
  if (!res.ok) {
    throw new Error("İstek başarısız");
  }
  return (await res.json()) as EvolutionConnectionState;
}

async function postEvolutionPairingCode(
  phoneNumber: string,
  webhookUrl: string
): Promise<EvolutionConnectionState> {
  const res = await fetch("/api/admin/evolution/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "request-pairing-code",
      phoneNumber,
      webhookUrl,
    }),
  });
  if (!res.ok) {
    throw new Error("Eşleştirme kodu alınamadı");
  }
  return (await res.json()) as EvolutionConnectionState;
}

export default function WhatsappEvolutionConnection({
  evolutionBaseUrl,
  evolutionApiKey,
  evolutionInstanceName,
  webhookUrl,
  embedded = false,
}: {
  evolutionBaseUrl: string;
  evolutionApiKey: string;
  evolutionInstanceName: string;
  webhookUrl: string;
  embedded?: boolean;
}) {
  const [baseUrl, setBaseUrl] = useState(evolutionBaseUrl);
  const [apiKey, setApiKey] = useState(evolutionApiKey);
  const [instanceName, setInstanceName] = useState(evolutionInstanceName);
  const [connection, setConnection] = useState<EvolutionConnectionState | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; message: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [isBusy, setIsBusy] = useState(false);
  const [isCheckingPairing, setIsCheckingPairing] = useState(false);
  const [authMethod, setAuthMethod] = useState<"qr" | "phone">("qr");
  const [phoneNumber, setPhoneNumber] = useState("905436124151");
  const mountedRef = useRef(true);
  const qrShownAtRef = useRef<number | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  const applyState = useCallback((state: EvolutionConnectionState) => {
    if (!mountedRef.current) return;

    const resolved: EvolutionConnectionState =
      state.phoneId && state.status !== "WORKING"
        ? {
            ...state,
            status: "WORKING",
            pairingCode: null,
            qrDataUrl: null,
          }
        : state.status === "WORKING"
          ? { ...state, pairingCode: null, qrDataUrl: null }
          : state;

    setConnection((prev) => {
      let next = resolved;
      if (
        !resolved.qrDataUrl &&
        prev?.qrDataUrl &&
        resolved.status === "SCAN_QR_CODE"
      ) {
        next = { ...resolved, qrDataUrl: prev.qrDataUrl };
      }
      if (
        !resolved.pairingCode &&
        prev?.pairingCode &&
        (resolved.status === "SCAN_QR_CODE" || resolved.status === "STARTING") &&
        !resolved.phoneId
      ) {
        next = { ...next, pairingCode: prev.pairingCode };
      }
      return next;
    });

    if (resolved.status === "WORKING" && lastStatusRef.current !== "WORKING") {
      setNotice({ type: "ok", message: "WhatsApp bağlantısı aktif" });
      window.dispatchEvent(new Event("takvim-whatsapp-connected"));
    }

    lastStatusRef.current = resolved.status;

    if (resolved.status === "SCAN_QR_CODE" && resolved.qrDataUrl) {
      if (!qrShownAtRef.current) qrShownAtRef.current = Date.now();
    } else if (resolved.status !== "SCAN_QR_CODE") {
      qrShownAtRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // İlk yükleme: QR ile birlikte
  useEffect(() => {
    if (!baseUrl.trim() || !apiKey.trim()) return;
    let cancelled = false;
    (async () => {
      try {
        const state = await fetchEvolutionStatus(true);
        if (!cancelled) applyState(state);
      } catch {
        // ignore first load errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, apiKey, applyState]);

  // Eşleştirme kodu veya QR beklerken sık durum yoklaması
  useEffect(() => {
    if (!connection?.configured) return;
    const status = connection.status;
    const waitingForPairing = Boolean(connection.pairingCode);
    if (
      status !== "SCAN_QR_CODE" &&
      status !== "STARTING" &&
      !waitingForPairing
    ) {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      if (waitingForPairing) setIsCheckingPairing(true);
      try {
        const state = await fetchEvolutionStatus(false);
        if (!cancelled) applyState(state);
      } catch {
        // geçici hata yoksay
      } finally {
        if (!cancelled && waitingForPairing) setIsCheckingPairing(false);
      }
    };

    void poll();
    const intervalMs = waitingForPairing ? 1000 : 2500;
    const timer = window.setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      setIsCheckingPairing(false);
    };
  }, [
    connection?.configured,
    connection?.status,
    connection?.pairingCode,
    applyState,
  ]);

  // QR sadece 60 sn sonra yenilenir
  useEffect(() => {
    if (connection?.status !== "SCAN_QR_CODE") return;

    const timer = window.setInterval(() => {
      const shownAt = qrShownAtRef.current;
      if (!shownAt || Date.now() - shownAt < 60_000) return;
      void (async () => {
        try {
          const state = await fetchEvolutionStatus(true);
          applyState(state);
          if (state.qrDataUrl) qrShownAtRef.current = Date.now();
        } catch {
          // ignore
        }
      })();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [connection?.status, applyState]);

  function handleSaveSettings() {
    setNotice(null);
    if (isPlaceholderApiKey(apiKey)) {
      setNotice({
        type: "error",
        message:
          "API anahtarı geçersiz. evolution/.env dosyasındaki AUTHENTICATION_API_KEY değerini yapıştırın.",
      });
      return;
    }
    startTransition(async () => {
      const result = await saveSettingsToServer(baseUrl, apiKey, instanceName);
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message ?? result.error ?? "Kayıt başarısız",
      });
      if (result.success) {
        const state = await fetchEvolutionStatus(true);
        applyState(state);
      }
    });
  }

  async function ensureSettingsSaved(): Promise<boolean> {
    if (!baseUrl.trim()) {
      setNotice({ type: "error", message: "Evolution API sunucu adresi gerekli" });
      return false;
    }
    if (isPlaceholderApiKey(apiKey)) {
      setNotice({
        type: "error",
        message:
          "Önce API anahtarını girin: evolution/.env → AUTHENTICATION_API_KEY satırındaki değer",
      });
      return false;
    }
    const result = await saveSettingsToServer(baseUrl, apiKey, instanceName);
    if (!result.success) {
      setNotice({
        type: "error",
        message: result.error ?? "Ayarlar kaydedilemedi",
      });
      return false;
    }
    return true;
  }

  async function handleConnect(mode: "start" | "retry" | "force-restart" = "start") {
    setNotice(null);
    setIsBusy(true);
    // Eski QR'ı temizle ki loading görünsün
    if (mode !== "start") {
      setConnection((prev) =>
        prev ? { ...prev, qrDataUrl: null, status: "STARTING", error: null } : prev
      );
      qrShownAtRef.current = null;
    }
    try {
      if (!(await ensureSettingsSaved())) return;

      const state = await postEvolutionAction(mode, webhookUrl);
      applyState(state);
      if (state.qrDataUrl) qrShownAtRef.current = Date.now();

      if (state.error) {
        setNotice({ type: "error", message: state.error });
      } else if (state.status === "WORKING") {
        setNotice({ type: "ok", message: "WhatsApp bağlantısı aktif" });
      } else if (state.status === "SCAN_QR_CODE" && state.qrDataUrl) {
        setNotice({
          type: "ok",
          message: "Yeni QR kodu hazır — 60 saniye içinde telefonunuzla okutun",
        });
      } else if (state.status === "STARTING") {
        setNotice({
          type: "ok",
          message: "Oturum başlatılıyor — QR birkaç saniye içinde gelecek",
        });
      } else if (state.status === "FAILED") {
        setNotice({
          type: "error",
          message: "Oturum başarısız. 'Tekrar Dene' ile yeniden başlatın.",
        });
      } else if (state.status === "SCAN_QR_CODE" && !state.qrDataUrl) {
        setNotice({
          type: "ok",
          message: "QR hazırlanıyor — birkaç saniye bekleyin",
        });
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Bağlantı kurulamadı",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCheckConnection() {
    setNotice(null);
    setIsBusy(true);
    try {
      const state = await fetchEvolutionStatus(false);
      applyState(state);
      if (state.status === "WORKING" || state.phoneId) {
        setNotice({ type: "ok", message: "WhatsApp bağlantısı aktif" });
      } else if (state.status === "FAILED") {
        setNotice({
          type: "error",
          message: "Oturum başarısız. Yeni kod alın veya QR ile deneyin.",
        });
      } else {
        setNotice({
          type: "ok",
          message: "Henüz bağlantı tamamlanmadı — telefonda kodu girdiğinizden emin olun",
        });
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Durum kontrol edilemedi",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRequestPairingCode() {
    setNotice(null);
    setIsBusy(true);
    setConnection((prev) =>
      prev
        ? { ...prev, pairingCode: null, error: null }
        : prev
    );
    try {
      if (!(await ensureSettingsSaved())) return;

      const state = await postEvolutionPairingCode(phoneNumber, webhookUrl);
      applyState(state);

      if (state.error) {
        setNotice({ type: "error", message: state.error });
      } else if (state.status === "WORKING") {
        setNotice({ type: "ok", message: "WhatsApp bağlantısı aktif" });
      } else if (state.pairingCode) {
        setNotice({
          type: "ok",
          message:
            "Eşleştirme kodu hazır — WhatsApp uygulamasında telefon numarası ile bağlan seçeneğine girin",
        });
        // Kod girildikten sonra hızlı kontrol
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const latest = await fetchEvolutionStatus(false);
          applyState(latest);
          if (latest.status === "WORKING" || latest.phoneId) break;
        }
      }
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Eşleştirme kodu alınamadı. QR ile bağlanmayı deneyin.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  function handleDisconnect() {
    if (!window.confirm("WhatsApp bağlantısı kesilsin mi?")) return;
    setNotice(null);
    startTransition(async () => {
      const state = await disconnectEvolutionAction();
      applyState(state);
      setNotice({ type: "ok", message: "WhatsApp bağlantısı kesildi" });
    });
  }

  const status = connection?.status ?? null;
  const busy = isPending || isBusy;

  return (
    <section
      className={
        embedded
          ? "bg-white p-5"
          : "rounded-2xl border border-gray-200 bg-white p-5"
      }
    >
      <div
        className={`flex flex-wrap items-start justify-between gap-3 ${
          embedded ? "sr-only" : ""
        }`}
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-800">
            Takvim WhatsApp Bağlantısı
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Evolution API üzerinden QR veya telefon numarası ile WhatsApp
            bağlantısı kurun. Bu bağlantı Bildirim WhatsApp&apos;tan tamamen
            bağımsızdır; takvim otomasyonu ve misafir karşılayan bildirimleri
            bu hat üzerinden çalışır.
          </p>
        </div>
        {connection?.configured && status ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}
          >
            {STATUS_LABELS[status] ?? status}
          </span>
        ) : null}
      </div>

      {notice ? (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            notice.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {connection?.error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {connection.error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              Evolution API Sunucu Adresi
            </span>
            <input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className={inputClass}
              placeholder="http://localhost:8080"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              Evolution API Anahtarı
            </span>
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className={inputClass}
              placeholder="örn. dda43df148a748b1827dd63b7804bab9"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">Instance Adı</span>
            <input
              value={instanceName}
              onChange={(event) => setInstanceName(event.target.value)}
              className={inputClass}
              placeholder="tatil-villa"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={busy}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Ayarları Kaydet
            </button>
          </div>

          <div className="flex rounded-xl border border-gray-200 bg-gray-50/80 p-1">
            <button
              type="button"
              onClick={() => setAuthMethod("qr")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                authMethod === "qr"
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              QR ile Bağlan
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod("phone")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                authMethod === "phone"
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Telefon Numarası ile Bağlan
            </button>
          </div>

          {authMethod === "qr" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void handleConnect(
                    status === "FAILED" || status === "STOPPED" || !status
                      ? "retry"
                      : "start"
                  )
                }
                disabled={busy}
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {status === "WORKING"
                  ? "Durumu Yenile"
                  : status === "FAILED" || status === "STOPPED"
                    ? "Tekrar Dene"
                    : "QR ile Bağlan"}
              </button>
              {status === "WORKING" ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={busy}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Bağlantıyı Kes
                </button>
              ) : null}
              {status === "SCAN_QR_CODE" || status === "STARTING" ? (
                <button
                  type="button"
                  onClick={() => void handleConnect("force-restart")}
                  disabled={busy}
                  className="rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-60"
                >
                  Yeni QR Al
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">
                  WhatsApp Telefon Numarası
                </span>
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className={inputClass}
                  placeholder="905551234567"
                  inputMode="tel"
                />
              </label>
              <p className="text-xs text-gray-500">
                Ülke kodu ile girin, + işareti kullanmayın. Örn: 905551234567 veya
                05551234567
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleRequestPairingCode()}
                  disabled={busy || !phoneNumber.trim()}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  Eşleştirme Kodu Al
                </button>
                {connection?.pairingCode && status !== "WORKING" ? (
                  <button
                    type="button"
                    onClick={() => void handleCheckConnection()}
                    disabled={busy}
                    className="rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-60"
                  >
                    Bağlantıyı Kontrol Et
                  </button>
                ) : null}
                {status === "WORKING" ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={busy}
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Bağlantıyı Kes
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">
            {authMethod === "qr"
              ? "QR okuttuktan sonra ekran otomatik \"Bağlı\" olur. Aynı QR 60 saniye geçerlidir — bu sürede tekrar basmayın."
              : "Kodu aldıktan sonra WhatsApp → Bağlı Cihazlar → Telefon numarası ile bağlan yolunu izleyin. Kod çalışmazsa QR sekmesine geçin."}
          </p>
        </div>

        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-6 text-center">
          {status === "WORKING" ? (
            <div className="space-y-2">
              <p className="text-lg font-semibold text-emerald-700">WhatsApp bağlı</p>
              {connection?.pushName ? (
                <p className="text-sm text-gray-700">{connection.pushName}</p>
              ) : null}
              {connection?.phoneId ? (
                <p className="text-xs text-gray-500">{connection.phoneId}</p>
              ) : null}
              <p className="text-sm text-gray-500">
                Instance bağlandı. Takvim webhook entegrasyonu test aşamasında.
              </p>
            </div>
          ) : connection?.pairingCode ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Eşleştirme Kodu</p>
              <p className="rounded-xl border border-violet-200 bg-white px-6 py-4 font-mono text-3xl font-bold tracking-[0.35em] text-violet-800">
                {connection.pairingCode}
              </p>
              <p className="text-sm text-gray-600">
                WhatsApp → Bağlı Cihazlar → Cihaz Bağla → Telefon numarası ile bağlan
              </p>
              {isCheckingPairing ? (
                <p className="text-xs font-medium text-violet-700">
                  Bağlantı kontrol ediliyor…
                </p>
              ) : (
                <p className="text-xs text-amber-700">
                  Kodu girdikten sonra ekran otomatik &quot;Bağlı&quot; olur.
                </p>
              )}
            </div>
          ) : connection?.qrDataUrl ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={connection.qrDataUrl}
                alt="WhatsApp QR kodu"
                className="h-56 w-56 rounded-xl border border-gray-200 bg-white p-3"
              />
              <p className="text-sm text-gray-600">
                WhatsApp → Bağlı Cihazlar → Cihaz Bağla → QR okut
              </p>
              <p className="text-xs text-amber-700">
                Aynı QR 60 saniye geçerli — bu sürede okutun.
              </p>
            </div>
          ) : status === "STARTING" ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Oturum başlatılıyor, QR hazırlanıyor…
              </p>
            </div>
          ) : status === "FAILED" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">Oturum başarısız oldu</p>
              <p className="text-xs text-gray-500">
                &quot;Tekrar Dene&quot; ile yeni QR alın.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-500">
              <p>
                {authMethod === "phone"
                  ? "Telefon numaranızı girin ve \"Eşleştirme Kodu Al\" deyin."
                  : "Evolution API ayarlarını kaydedin ve \"QR ile Bağlan\" deyin."}
              </p>
              <p>
                {authMethod === "phone"
                  ? "Kod burada görünecek."
                  : "QR kodu burada görünecek."}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
