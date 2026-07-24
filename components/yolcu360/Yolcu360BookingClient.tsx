"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Yolcu360CarResult, Yolcu360ExtraProduct } from "@/lib/yolcu360/types";
import { formatYolcu360Money } from "@/lib/yolcu360/settings";
import Yolcu360FindeksWizard from "@/components/yolcu360/Yolcu360FindeksWizard";
import {
  loadYolcu360BookingSession,
  saveYolcu360BookingSession,
} from "@/lib/yolcu360/session";

export default function Yolcu360BookingClient() {
  const router = useRouter();
  const [session, setSession] = useState(loadYolcu360BookingSession());
  const [extras, setExtras] = useState<Yolcu360ExtraProduct[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [findeksVerified, setFindeksVerified] = useState(
    () => Boolean(session?.findeksVerified)
  );

  const car = session?.car as Yolcu360CarResult | undefined;
  const requiresFindeks = Boolean(session?.isFindeksRequired);
  const integrationCode = session?.integrationCode ?? "";

  useEffect(() => {
    if (!session?.searchID || !session.code) return;
    fetch(
      `/api/yolcu360/extra-products?searchID=${encodeURIComponent(session.searchID)}&code=${encodeURIComponent(session.code)}`
    )
      .then((res) => res.json())
      .then((data) => setExtras(Array.isArray(data) ? data : []))
      .catch(() => setExtras([]));
  }, [session?.searchID, session?.code]);

  if (!session || !car) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Rezervasyon oturumu bulunamadı.{" "}
        <Link href="/arac-kiralama" className="font-semibold underline">
          Yeni arama yapın
        </Link>
      </div>
    );
  }

  const total = car.pricing?.paymentTotal ?? car.pricing?.total;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const bookingSession = session;
    if (!bookingSession) return;
    if (requiresFindeks && !findeksVerified) {
      setError("Findeks doğrulamasını tamamlayın.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const extraProducts = Object.entries(selectedExtras)
        .filter(([, qty]) => qty > 0)
        .map(([code, quantity]) => ({ code, quantity }));

      const res = await fetch("/api/yolcu360/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: "creditCard",
          searchID: bookingSession.searchID,
          code: bookingSession.code,
          extraProducts,
          passenger: {
            firstName,
            lastName,
            email,
            nationality: "TR",
            phone,
            birthDate,
            identityNumber,
          },
          searchSnapshot: bookingSession,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sipariş oluşturulamadı");

      saveYolcu360BookingSession({
        ...bookingSession,
        extras: extraProducts,
        findeksVerified: requiresFindeks ? findeksVerified : undefined,
      });
      sessionStorage.setItem(
        "yolcu360.orderId",
        data.order.id as string
      );
      router.push(`/arac-kiralama/odeme?orderID=${encodeURIComponent(data.order.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sipariş oluşturulamadı");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">Yolcu bilgileri</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ad"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Soyad"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm sm:col-span-2"
            />
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+905551234567"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              required
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              required
              value={identityNumber}
              onChange={(e) => setIdentityNumber(e.target.value)}
              placeholder="TC Kimlik No"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm sm:col-span-2"
            />
          </div>
        </section>

        {requiresFindeks && integrationCode ? (
          <Yolcu360FindeksWizard
            identityNumber={identityNumber}
            integrationCode={integrationCode}
            onVerified={() => {
              setFindeksVerified(true);
              if (session) {
                saveYolcu360BookingSession({
                  ...session,
                  findeksVerified: true,
                });
              }
            }}
          />
        ) : null}

        {extras.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-900">Ek ürünler</h2>
            <div className="mt-3 space-y-2">
              {extras.map((extra) => (
                <label
                  key={extra.code}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
                >
                  <span className="text-sm text-slate-700">{extra.name}</span>
                  <div className="flex items-center gap-2">
                    {extra.pricing?.total ? (
                      <span className="text-sm font-semibold text-teal-700">
                        {formatYolcu360Money(
                          extra.pricing.total.amount,
                          extra.pricing.total.currency
                        )}
                      </span>
                    ) : null}
                    <input
                      type="number"
                      min={0}
                      max={extra.max ?? 1}
                      value={selectedExtras[extra.code] ?? 0}
                      onChange={(e) =>
                        setSelectedExtras((prev) => ({
                          ...prev,
                          [extra.code]: Number(e.target.value),
                        }))
                      }
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <aside className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Özet</h2>
        <p className="mt-2 font-medium text-slate-800">
          {car.brand?.name} {car.model?.name}
        </p>
        <p className="text-sm text-slate-500">{car.vendor?.displayName}</p>
        {total ? (
          <p className="mt-4 text-2xl font-bold text-teal-700">
            {formatYolcu360Money(total.amount, total.currency)}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || (requiresFindeks && !findeksVerified)}
          className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {loading ? "Oluşturuluyor…" : "Ödemeye geç"}
        </button>
      </aside>
    </form>
  );
}
