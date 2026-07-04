"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { assignVillaOwner } from "@/app/actions/admin/villas";
import VillaOwnerFormModal from "@/components/admin/villa-owners/VillaOwnerFormModal";
import TurkishPhoneField from "@/components/admin/ui/TurkishPhoneField";
import type { ActiveVillaOwnerOption } from "@/lib/queries/villa-owners";
import type { TurkeyProvince } from "@/lib/mernis-ilce";
import { includesSearchText } from "@/lib/search-text";
import { formatOwnerPhoneDisplay } from "@/lib/villa-owner-utils";
import type { Villa, VillaOwner } from "@prisma/client";

interface VillaPersonelTabProps {
  villa: Villa & { owner: VillaOwner | null };
  activeOwners: ActiveVillaOwnerOption[];
  provinces: TurkeyProvince[];
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-800">{title}</h2>
      {children}
    </section>
  );
}

export default function VillaPersonelTab({
  villa,
  activeOwners,
  provinces,
}: VillaPersonelTabProps) {
  const router = useRouter();
  const [isSelectingOwner, setIsSelectingOwner] = useState(!villa.ownerId);
  const [search, setSearch] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState(villa.ownerId ?? "");
  const [savedOwnerId, setSavedOwnerId] = useState(villa.ownerId ?? "");
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [isSavingOwner, startSaveOwner] = useTransition();

  const savedOwner = useMemo(
    () => activeOwners.find((owner) => owner.id === savedOwnerId) ?? villa.owner,
    [activeOwners, savedOwnerId, villa.owner]
  );

  const filteredOwners = useMemo(() => {
    if (!search.trim()) return activeOwners;

    return activeOwners.filter((owner) =>
      includesSearchText(
        [owner.name, owner.phone, owner.email].join(" "),
        search
      )
    );
  }, [activeOwners, search]);

  function handleSaveOwner() {
    if (!selectedOwnerId) {
      setOwnerError("Lütfen bir villa sahibi seçin");
      return;
    }

    setOwnerError(null);
    startSaveOwner(async () => {
      const result = await assignVillaOwner(villa.id, selectedOwnerId);
      if (result.error) {
        setOwnerError(result.error);
        return;
      }
      setSavedOwnerId(selectedOwnerId);
      setIsSelectingOwner(false);
      router.refresh();
    });
  }

  function handleOwnerCreated(ownerId: string) {
    setSelectedOwnerId(ownerId);
    setSearch("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Villa Sahibi">
        {!isSelectingOwner && savedOwner ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-semibold text-gray-900">
                {savedOwner.name}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {formatOwnerPhoneDisplay(savedOwner.phone)}
                {savedOwner.email ? ` · ${savedOwner.email}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSelectingOwner(true);
                setSelectedOwnerId(savedOwnerId);
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Değiştir
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Villa sahibi seçin
              </span>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ada, telefona veya e-postaya göre ara..."
                  className={`${inputClass} pl-10`}
                />
              </div>
            </label>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200">
              {filteredOwners.length > 0 ? (
                filteredOwners.map((owner) => {
                  const isSelected = selectedOwnerId === owner.id;
                  return (
                    <button
                      key={owner.id}
                      type="button"
                      onClick={() => setSelectedOwnerId(owner.id)}
                      className={`flex w-full items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 ${
                        isSelected
                          ? "bg-teal-50"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {owner.name}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatOwnerPhoneDisplay(owner.phone)}
                          {owner.email ? ` · ${owner.email}` : ""}
                        </p>
                      </div>
                      {isSelected ? (
                        <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-semibold text-white uppercase">
                          Seçili
                        </span>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <p className="px-4 py-6 text-center text-sm text-gray-500">
                  Aramanızla eşleşen aktif villa sahibi bulunamadı.
                </p>
              )}
            </div>

            {ownerError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {ownerError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveOwner}
                disabled={isSavingOwner || !selectedOwnerId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingOwner ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button
                type="button"
                onClick={() => setShowOwnerModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
              >
                <Plus className="h-4 w-4" />
                Villa Sahibi Ekle
              </button>
              {savedOwnerId ? (
                <button
                  type="button"
                  onClick={() => setIsSelectingOwner(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  İptal
                </button>
              ) : null}
            </div>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Müşteri Karşılayan">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Ad Soyad</span>
              <input
                name="greeterName"
                defaultValue={villa.greeterName}
                className={`mt-1.5 ${inputClass}`}
              />
            </label>
            <TurkishPhoneField
              name="greeterPhone"
              defaultValue={villa.greeterPhone}
            />
            <p className="text-xs text-gray-500">
              İstediğiniz zaman elle düzenleyebilirsiniz.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Takvim Yöneten">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Ad Soyad</span>
              <input
                name="calendarManagerName"
                defaultValue={villa.calendarManagerName}
                className={`mt-1.5 ${inputClass}`}
              />
            </label>
            <TurkishPhoneField
              name="calendarManagerPhone"
              defaultValue={villa.calendarManagerPhone}
            />
            <p className="text-xs text-gray-500">
              İstediğiniz zaman elle düzenleyebilirsiniz.
            </p>
          </div>
        </SectionCard>
      </div>

      {showOwnerModal ? (
        <VillaOwnerFormModal
          provinces={provinces}
          onClose={() => setShowOwnerModal(false)}
          onCreated={handleOwnerCreated}
        />
      ) : null}
    </div>
  );
}
