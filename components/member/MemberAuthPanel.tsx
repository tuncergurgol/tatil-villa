"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  loginMemberWithEmailAction,
  startMemberPhoneLoginAction,
  startMemberRegisterAction,
  startMemberReservationLoginAction,
  verifyMemberPhoneLoginAction,
  verifyMemberRegisterAction,
  verifyMemberReservationLoginAction,
  type MemberAuthState,
} from "@/app/actions/member-auth";
import { lookupReturningGuestAction } from "@/app/actions/returning-guest";
import TurkishPhoneField from "@/components/admin/ui/TurkishPhoneField";
import ReturningGuestBanner from "@/components/member/ReturningGuestBanner";
import type { ReturningGuestPreview } from "@/lib/returning-guest-shared";

type Tab = "phone" | "email" | "reservation" | "register";

export default function MemberAuthPanel({
  redirectTo = "/uye/hesabim",
  inviteCode = "",
}: {
  redirectTo?: string;
  inviteCode?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("phone");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [otpMode, setOtpMode] = useState<"login" | "register" | "reservation" | null>(null);
  const [phone, setPhone] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [welcomeTitle, setWelcomeTitle] = useState<string | null>(null);
  const [welcomeBody, setWelcomeBody] = useState<string | null>(null);
  const [liveGuest, setLiveGuest] = useState<ReturningGuestPreview | null>(null);

  function run(action: () => Promise<MemberAuthState>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.welcomeTitle) {
        setWelcomeTitle(result.welcomeTitle);
        setLiveGuest(null);
      }
      if (result.welcomeBody) setWelcomeBody(result.welcomeBody);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.message) setMessage(result.message);
      if (result.verifyPhone) setPhone(result.verifyPhone);
      if (result.needsVerification) {
        setOtpMode(
          result.otpMode ??
            (tab === "register"
              ? "register"
              : tab === "reservation"
                ? "reservation"
                : "login")
        );
        return;
      }
      if (result.success) {
        // Sayfa ?redirect= ile geldiyse rezervasyon akışına geri dön (aksiyon sabit /uye/hesabim döner).
        router.push(redirectTo || result.redirectTo || "/uye/hesabim");
        router.refresh();
      }
    });
  }

  useEffect(() => {
    if (otpMode) return;
    if (tab !== "phone" && tab !== "register") {
      setLiveGuest(null);
      return;
    }

    const email = tab === "register" ? registerEmail : "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 && !email.includes("@")) {
      setLiveGuest(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void lookupReturningGuestAction({ phone, email }).then((result) => {
        if (cancelled) return;
        setLiveGuest(result.match);
      });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tab, phone, registerEmail, otpMode]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "phone", label: "Telefon" },
    { id: "email", label: "E-posta" },
    { id: "reservation", label: "Rezervasyon" },
    { id: "register", label: "Üye Ol" },
  ];

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <div className="mb-4 flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-white"
        >
          Ana Sayfa
        </Link>
      </div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Müşteri Girişi</h1>
        <p className="mt-2 text-sm text-slate-600">
          Telefon ile WhatsApp doğrulaması, e-posta ile şifre veya yeni üyelik
          oluşturabilirsiniz.
        </p>
        {redirectTo !== "/uye/hesabim" ? (
          <p className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
            Giriş sonrası rezervasyon talebinize otomatik olarak döneceksiniz.
          </p>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setOtpMode(null);
              setError(null);
              setWelcomeTitle(null);
              setWelcomeBody(null);
              setLiveGuest(null);
            }}
            className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
              tab === item.id
                ? "border-teal-500 bg-teal-50 text-teal-800"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {liveGuest || welcomeTitle || welcomeBody ? (
        <div className="mb-4">
          <ReturningGuestBanner
            match={liveGuest}
            title={welcomeTitle ?? undefined}
            body={welcomeBody ?? undefined}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      {otpMode ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            WhatsApp ile gelen 5 haneli kod
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              inputMode="numeric"
              maxLength={5}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-[0.3em]"
              placeholder="00000"
            />
          </label>
          <button
            type="button"
            disabled={pending || otpCode.length !== 5}
            onClick={() =>
              run(() =>
                otpMode === "register"
                  ? verifyMemberRegisterAction({ phone, code: otpCode })
                  : otpMode === "reservation"
                    ? verifyMemberReservationLoginAction({ phone, code: otpCode })
                    : verifyMemberPhoneLoginAction({ phone, code: otpCode })
              )
            }
            className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Doğrula ve Giriş Yap
          </button>
        </div>
      ) : tab === "phone" ? (
        <div className="space-y-4">
          <TurkishPhoneField
            label="Telefon Numaranız"
            value={phone}
            onChange={setPhone}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await startMemberPhoneLoginAction(phone);
                if (result.needsVerification) setPhone(phone);
                return result;
              })
            }
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Kod Gönder
          </button>
        </div>
      ) : tab === "email" ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(() => loginMemberWithEmailAction(formData));
          }}
        >
          <label className="block text-sm font-medium text-slate-700">
            E-posta
            <input
              name="email"
              type="email"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Şifre
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Giriş Yap
          </button>
        </form>
      ) : tab === "reservation" ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(async () => {
              const result = await startMemberReservationLoginAction(formData);
              if (result.needsVerification && result.phone) {
                setPhone(result.phone);
              }
              return result;
            });
          }}
        >
          <label className="block text-sm font-medium text-slate-700">
            E-posta
            <input
              name="email"
              type="email"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Rezervasyon Kodu
            <input
              name="reservationCode"
              inputMode="numeric"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3"
              placeholder="Örn. 5902"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Kod Gönder
          </button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(async () => {
              const result = await startMemberRegisterAction(formData);
              if (result.needsVerification) {
                setPhone(formData.get("phone")?.toString() || "");
              }
              return result;
            });
          }}
        >
          <label className="block text-sm font-medium text-slate-700">
            İsim Soyisim
            <input
              name="fullName"
              required
              value={registerName}
              onChange={(event) => setRegisterName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            E-posta
            <input
              name="email"
              type="email"
              required
              value={registerEmail}
              onChange={(event) => setRegisterEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </label>
          <TurkishPhoneField
            label="Telefon"
            name="phone"
            value={phone}
            onChange={setPhone}
          />
          <label className="block text-sm font-medium text-slate-700">
            Davet Kodu (opsiyonel)
            <input
              name="inviteCode"
              defaultValue={inviteCode}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 uppercase"
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" name="acceptKvkk" value="true" required />
            <span>
              Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni&apos;ni ve
              Üyelik Sözleşmesi&apos;ni okudum ve kabul ediyorum.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" name="acceptMarketing" value="true" />
            <span>Fırsat ve kampanyalar hakkında haberdar olmak istiyorum.</span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Kayıt Ol ve Kod Gönder
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Rezervasyon doğrulama için{" "}
        <Link href="/rezervasyon-dogrulama" className="font-semibold text-teal-700">
          buraya tıklayın
        </Link>
        .
      </p>
    </div>
  );
}
