"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SalesType, VillaCategory } from "@prisma/client";
import { Save } from "lucide-react";
import { createVillaFromGeneral } from "@/app/actions/admin/villas";
import VillaGeneralTab, {
  type VillaGeneralFormValue,
} from "@/components/admin/villas/VillaGeneralTab";
import {
  buildVillaListPath,
  parseVillaListFilters,
} from "@/lib/villa-list-filters";

const tabs = [
  { id: "genel", label: "Genel" },
  { id: "galeri", label: "Galeri" },
  { id: "odalar", label: "Oda Yönetimi" },
  { id: "ozellikler", label: "Özellikler" },
  { id: "konum", label: "Konum & Çevre" },
  { id: "kurallar", label: "Kurallar" },
  { id: "personel", label: "Personel" },
  { id: "ical", label: "iCal Takvim" },
  { id: "meta", label: "Meta / SEO" },
] as const;

const emptyVilla: VillaGeneralFormValue = {
  id: "new",
  villaId: null,
  name: "",
  originalName: "",
  category: VillaCategory.villa,
  salesType: SalesType.komisyon,
  guests: 1,
  extraCapacity: 0,
  livingRooms: 0,
  bedrooms: 1,
  bathrooms: 1,
  active: false,
  showInSearch: false,
  showInOffer: false,
  ribbonText1: "",
  ribbonText2: "",
  description: "",
  amenities: [],
  allowChildren: false,
};

function formatSubmitError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Villa oluşturulamadı";
  return message === "Failed to fetch"
    ? "Sunucuya bağlanılamadı. Lütfen tekrar deneyin."
    : message;
}

export default function VillaCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = useMemo(
    () => buildVillaListPath(parseVillaListFilters(searchParams)),
    [searchParams]
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [bedroomDraft, setBedroomDraft] = useState(1);
  const [isPending, startTransition] = useTransition();

  function handleLockedTab() {
    setError(
      "Bu sekmeyi kullanmak için önce Genel bilgileri kaydedin. Kayıttan sonra tüm sekmeler otomatik açılacaktır."
    );
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit(formData: FormData) {
    setError(null);

    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      setError("Villa adı zorunludur");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createVillaFromGeneral(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.replace(result.editPath);
        router.refresh();
      } catch (submitError) {
        setError(formatSubmitError(submitError));
      }
    });
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Yeni Villa Ekle
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Yeni Villa</h1>
          <p className="mt-2 text-sm text-gray-500">
            Genel bilgileri kaydedin; ardından galeri, oda, özellik, konum ve
            diğer tüm sekmeler kullanıma açılır.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="shrink-0 border-b border-gray-200 bg-white px-6">
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const isGeneral = tab.id === "genel";
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={isGeneral ? undefined : handleLockedTab}
                  className={`border-b-2 px-4 py-4 text-sm font-medium transition ${
                    isGeneral
                      ? "cursor-default border-teal-600 text-teal-700"
                      : "cursor-pointer border-transparent text-gray-400 hover:border-gray-200 hover:text-gray-600"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(new FormData(event.currentTarget));
          }}
        >
          <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto p-6">
            {error ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {error}
              </div>
            ) : null}

            <VillaGeneralTab
              villa={emptyVilla}
              regionBreadcrumb=""
              roomCount={0}
              bedroomDraft={bedroomDraft}
              onBedroomsChange={setBedroomDraft}
              aiEnabled={false}
            />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <Link
              href={returnPath}
              className="cursor-pointer rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Kaydediliyor..." : "Kaydet ve Devam Et"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
