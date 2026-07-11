"use client";

import { useActionState, useEffect, useState } from "react";
import { VillaOwnerType } from "@prisma/client";
import { X } from "lucide-react";
import {
  createVillaOwner,
  updateVillaOwner,
  type VillaOwnerActionState,
} from "@/app/actions/admin/villa-owners";
import IlIlceSelect from "@/components/admin/villa-owners/IlIlceSelect";
import TurkishPhoneField from "@/components/admin/ui/TurkishPhoneField";
import TcKimlikInput from "@/components/shared/TcKimlikInput";
import type { VillaOwnerListItem } from "@/lib/queries/villa-owners";
import type { TurkeyProvince } from "@/lib/mernis-ilce";
import { VILLA_OWNER_TYPE_LABELS } from "@/lib/villa-owner-utils";
import { isTcKimlikAcceptable } from "@/lib/tc-kimlik";

interface VillaOwnerFormModalProps {
  owner?: VillaOwnerListItem;
  provinces: TurkeyProvince[];
  onClose: () => void;
  onCreated?: (ownerId: string) => void;
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  required,
  placeholder,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function TextareaField({
  label,
  name,
  defaultValue = "",
  required,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        rows={rows}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

export default function VillaOwnerFormModal({
  owner,
  provinces,
  onClose,
  onCreated,
}: VillaOwnerFormModalProps) {
  const isEdit = Boolean(owner);
  const action = isEdit ? updateVillaOwner : createVillaOwner;
  const [ownerType, setOwnerType] = useState<VillaOwnerType>(
    owner?.type ?? VillaOwnerType.GERCEK_KISI
  );
  const [country, setCountry] = useState(owner?.country || "Türkiye");
  const [active, setActive] = useState(owner?.active ?? true);
  const [tcKimlikNo, setTcKimlikNo] = useState(owner?.tcKimlikNo ?? "");
  const [state, formAction, pending] = useActionState<
    VillaOwnerActionState,
    FormData
  >(action, {});

  const isTurkey = country.trim() === "Türkiye";
  const tcRequired = ownerType === VillaOwnerType.GERCEK_KISI;
  const tcAcceptable = isTcKimlikAcceptable(tcKimlikNo, tcRequired);

  useEffect(() => {
    if (state.success) {
      if (!isEdit && state.id) onCreated?.(state.id);
      onClose();
    }
  }, [isEdit, onClose, onCreated, state.id, state.success]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Villa Sahibini Düzenle" : "Yeni Villa Sahibi"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          action={formAction}
          className="space-y-5 p-6"
          onSubmit={(event) => {
            if (!tcAcceptable) event.preventDefault();
          }}
        >
          {owner && <input type="hidden" name="id" value={owner.id} />}
          <input type="hidden" name="type" value={ownerType} />

          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          )}

          <div>
            <span className="text-xs font-medium text-gray-500">Kişi Tipi</span>
            <div className="mt-2 flex rounded-xl border border-gray-200 p-1">
              {(
                [
                  [VillaOwnerType.GERCEK_KISI, VILLA_OWNER_TYPE_LABELS.GERCEK_KISI],
                  [VillaOwnerType.TUZEL_KISI, VILLA_OWNER_TYPE_LABELS.TUZEL_KISI],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOwnerType(value)}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    ownerType === value
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {ownerType === VillaOwnerType.GERCEK_KISI ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Adı"
                name="firstName"
                defaultValue={owner?.firstName}
                placeholder="Ad"
              />
              <Field
                label="Soyadı"
                name="lastName"
                defaultValue={owner?.lastName}
                placeholder="Soyad"
              />
            </div>
          ) : (
            <>
              <Field
                label="Ünvanı"
                name="companyTitle"
                defaultValue={owner?.companyTitle}
                placeholder="Şirket ünvanı"
              />
              <Field
                label="Yetkili Adı Soyadı"
                name="authorizedPersonName"
                defaultValue={owner?.authorizedPersonName}
                placeholder="Yetkili kişi"
              />
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TurkishPhoneField
              name="phone"
              label="Telefon No"
              defaultValue={owner?.phone}
              focusPalette="indigo"
            />
            <Field
              label="E-posta Adresi"
              name="email"
              type="email"
              defaultValue={owner?.email}
              placeholder="ornek@email.com"
            />
          </div>

          {ownerType === VillaOwnerType.GERCEK_KISI ? (
            <TcKimlikInput
              label="TC Kimlik No"
              name="tcKimlikNo"
              value={tcKimlikNo}
              onChange={setTcKimlikNo}
              required
              placeholder="11 haneli TC kimlik no"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Vergi Dairesi"
                name="taxOffice"
                defaultValue={owner?.taxOffice}
                placeholder="Vergi dairesi"
              />
              <Field
                label="Vergi No"
                name="taxNumber"
                defaultValue={owner?.taxNumber}
                placeholder="Vergi numarası"
              />
            </div>
          )}

          <Field
            label="Banka Hesap Sahibi Adı Soyadı"
            name="bankAccountHolder"
            defaultValue={owner?.bankAccountHolder}
            placeholder="Hesap sahibi"
          />
          <Field
            label="Banka IBAN"
            name="bankIban"
            defaultValue={owner?.bankIban}
            placeholder="TR00 0000 0000 0000 0000 0000 00"
          />
          <Field
            label="Muhasebe Kodu"
            name="accountingCode"
            defaultValue={owner?.accountingCode}
            placeholder="Muhasebe kodu"
          />

          <label className="block">
            <span className="text-xs font-medium text-gray-500">Ülke</span>
            <input
              name="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Ülke"
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          {isTurkey ? (
            <IlIlceSelect
              provinces={provinces}
              defaultMernisCode={owner?.mernisIlceCode}
            />
          ) : (
            <input type="hidden" name="mernisIlceCode" value="" />
          )}

          <TextareaField
            label="Adres"
            name="address"
            defaultValue={owner?.address}
            rows={3}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-gray-700">Aktif</span>
          </label>
          <input type="hidden" name="active" value={active ? "true" : "false"} />

          {owner?.user && (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Bağlı kullanıcı:{" "}
              <span className="font-medium text-slate-900">
                {owner.user.name} ({owner.user.email})
              </span>
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={pending || !tcAcceptable}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
