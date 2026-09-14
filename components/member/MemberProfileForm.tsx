"use client";

import { useState, useTransition } from "react";
import { updateMemberProfileAction } from "@/app/actions/member-profile";
import TurkishPhoneField from "@/components/admin/ui/TurkishPhoneField";

export default function MemberProfileForm({
  member,
}: {
  member: { fullName: string; email: string; phone: string };
}) {
  const [fullName, setFullName] = useState(member.fullName);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.set("fullName", fullName);
        formData.set("email", email);
        formData.set("phone", phone);
        if (password.trim()) formData.set("password", password);
        startTransition(async () => {
          const result = await updateMemberProfileAction(formData);
          if (result.error) setError(result.error);
          else {
            setError(null);
            setMessage(result.message ?? "Bilgiler güncellendi");
            setPassword("");
          }
        });
      }}
    >
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      <label className="block text-sm font-medium text-slate-700">
        Ad Soyad
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        E-posta
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3"
        />
      </label>
      <TurkishPhoneField label="Telefon" value={phone} onChange={setPhone} />
      <label className="block text-sm font-medium text-slate-700">
        Yeni Şifre (opsiyonel)
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        Kaydet
      </button>
    </form>
  );
}
