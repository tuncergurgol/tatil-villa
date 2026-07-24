"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function Yolcu360PaymentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderID = searchParams.get("orderID") ?? "";
  const [cardNumber, setCardNumber] = useState("");
  const [expireMonth, setExpireMonth] = useState("");
  const [expireYear, setExpireYear] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cvc, setCvc] = useState("");
  const [installment, setInstallment] = useState(1);
  const [installments, setInstallments] = useState<
    Array<{ number: number; label: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threeDSHtml, setThreeDSHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!orderID || cardNumber.replace(/\s/g, "").length < 6) return;
    const bin = cardNumber.replace(/\s/g, "").slice(0, 6);
    fetch("/api/yolcu360/payment?action=installments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderID, binNumber: bin }),
    })
      .then((res) => res.json())
      .then((data) => {
        const list = (data.installmentPrices ?? []).map(
          (item: { number: number; totalPrice?: { amount: number; currency: string } }) => ({
            number: item.number,
            label: `${item.number} taksit`,
          })
        );
        setInstallments(list.length > 0 ? list : [{ number: 1, label: "Tek çekim" }]);
      })
      .catch(() => setInstallments([{ number: 1, label: "Tek çekim" }]));
  }, [orderID, cardNumber]);

  async function handlePay(event: React.FormEvent) {
    event.preventDefault();
    if (!orderID) return;
    setLoading(true);
    setError(null);

    try {
      const callbackUrl = `${window.location.origin}/api/yolcu360/payment/return`;
      const res = await fetch("/api/yolcu360/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderID,
          paymentType: "creditCard",
          payWithCard: {
            cardNumber: cardNumber.replace(/\s/g, ""),
            expireMonth,
            expireYear,
            cardHolderName,
            cvc,
            installment,
            isWith3DSecure: true,
            callbackUrl,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ödeme başarısız");

      if (data.is3dsSecure && data.threeDSHtmlContent) {
        setThreeDSHtml(data.threeDSHtmlContent);
        return;
      }

      if (data.status === "success") {
        router.push(
          `/arac-kiralama/basarili?orderID=${encodeURIComponent(orderID)}&status=success`
        );
        return;
      }

      throw new Error("Ödeme tamamlanamadı");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ödeme başarısız");
    } finally {
      setLoading(false);
    }
  }

  if (!orderID) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        Sipariş bulunamadı.{" "}
        <Link href="/arac-kiralama" className="font-semibold underline">
          Ana sayfaya dön
        </Link>
      </div>
    );
  }

  if (threeDSHtml) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm text-slate-600">3D Secure doğrulaması…</p>
        <iframe
          title="3D Secure"
          srcDoc={threeDSHtml}
          className="h-[520px] w-full rounded-xl border border-slate-200"
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={handlePay}
      className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-bold text-slate-900">Ödeme</h1>
      <p className="mt-1 text-sm text-slate-500">Sipariş: {orderID}</p>

      <div className="mt-5 space-y-3">
        <input
          required
          value={cardHolderName}
          onChange={(e) => setCardHolderName(e.target.value)}
          placeholder="Kart üzerindeki isim"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        <input
          required
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="Kart numarası"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            required
            value={expireMonth}
            onChange={(e) => setExpireMonth(e.target.value)}
            placeholder="AA"
            maxLength={2}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            required
            value={expireYear}
            onChange={(e) => setExpireYear(e.target.value)}
            placeholder="YY"
            maxLength={4}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            required
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            placeholder="CVC"
            maxLength={4}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
        <select
          value={installment}
          onChange={(e) => setInstallment(Number(e.target.value))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          {installments.map((item) => (
            <option key={item.number} value={item.number}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {loading ? "İşleniyor…" : "Ödemeyi tamamla"}
      </button>
    </form>
  );
}
