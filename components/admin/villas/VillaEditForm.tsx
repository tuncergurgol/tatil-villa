"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import GalleryImage from "@/components/GalleryImage";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Villa, VillaOwner } from "@prisma/client";
import { ArrowLeft, CalendarDays, ExternalLink, Save } from "lucide-react";
import {
  updateVillaFeatures,
  updateVillaGeneral,
  updateVillaLocation,
  updateVillaMetaSeo,
  updateVillaPersonel,
  updateVillaRules,
} from "@/app/actions/admin/villas";
import VillaBedroomReduceModal from "@/components/admin/villas/VillaBedroomReduceModal";
import VillaRoomsTab from "@/components/admin/villas/VillaRoomsTab";
import VillaGalleryTab from "@/components/admin/villas/VillaGalleryTab";
import VillaGeneralTab from "@/components/admin/villas/VillaGeneralTab";
import VillaFeaturesTab from "@/components/admin/villas/VillaFeaturesTab";
import VillaIcalTab from "@/components/admin/villas/VillaIcalTab";
import VillaLocationTab from "@/components/admin/villas/VillaLocationTab";
import VillaMetaSeoTab from "@/components/admin/villas/VillaMetaSeoTab";
import VillaPersonelTab, {
  type VillaPersonelTabHandle,
} from "@/components/admin/villas/VillaPersonelTab";
import VillaOwnerFormModal from "@/components/admin/villa-owners/VillaOwnerFormModal";
import VillaRulesTab from "@/components/admin/villas/VillaRulesTab";
import type { VillaPoolWithPeriods } from "@/components/admin/villas/VillaPoolManager";
import type { AmenityCategoryItem } from "@/lib/queries/amenities";
import type { FacilityCategoryOption } from "@/lib/queries/facility-categories";
import type { PriceInclusionItem } from "@/lib/queries/price-inclusion";
import { villaPublicPath } from "@/lib/villa-public-path";
import { villaTakvimPath } from "@/lib/villa-takvim-path";
import type { ActiveVillaOwnerOption } from "@/lib/queries/villa-owners";
import type {
  RegionPickerOption,
  SurroundingLocationOption,
} from "@/lib/villa-location-helpers";
import type { VillaIcalTabData } from "@/lib/queries/villa-ical";
import type { VillaRoom } from "@prisma/client";
import type { TurkeyProvince } from "@/lib/mernis-ilce";
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

type TabId = (typeof tabs)[number]["id"];

interface VillaEditFormProps {
  villa: Villa & { owner: VillaOwner | null };
  pools: VillaPoolWithPeriods[];
  amenityCategories: AmenityCategoryItem[];
  facilityCategories: FacilityCategoryOption[];
  priceInclusionItems: PriceInclusionItem[];
  previewDomain: string;
  activeOwners: ActiveVillaOwnerOption[];
  provinces: TurkeyProvince[];
  locationRegions: RegionPickerOption[];
  surroundingLocations: SurroundingLocationOption[];
  distanceByLocationId: Record<string, number>;
  icalData: VillaIcalTabData;
  galleryImages: string[];
  rooms: VillaRoom[];
  prepaymentPaymentTypes: { id: string; name: string }[];
  regionBreadcrumb: string;
}

function formatSubmitError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Kayıt başarısız";
  if (message === "Failed to fetch") {
    return "Sunucuya bağlanılamadı. Derleme bitene kadar bekleyip tekrar deneyin.";
  }
  return message;
}

export default function VillaEditForm({
  villa,
  pools,
  amenityCategories,
  facilityCategories,
  priceInclusionItems,
  previewDomain,
  activeOwners,
  provinces,
  locationRegions,
  surroundingLocations,
  distanceByLocationId,
  icalData,
  galleryImages,
  rooms,
  prepaymentPaymentTypes,
  regionBreadcrumb,
}: VillaEditFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = useMemo(
    () => buildVillaListPath(parseVillaListFilters(searchParams)),
    [searchParams]
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const personelTabRef = useRef<VillaPersonelTabHandle>(null);
  const [activeTab, setActiveTab] = useState<TabId>("genel");
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [bedroomDraft, setBedroomDraft] = useState(villa.bedrooms);
  const [bedroomReduceConfirm, setBedroomReduceConfirm] = useState<{
    formData: FormData;
    newBedroomCount: number;
  } | null>(null);
  const showcaseImage = galleryImages[0] ?? "";

  useEffect(() => {
    setBedroomDraft(villa.bedrooms);
  }, [villa.bedrooms]);

  function switchTab(tabId: TabId) {
    if (tabId !== "personel") {
      setOwnerModalOpen(false);
    }
    setActiveTab(tabId);
    contentRef.current?.scrollTo({ top: 0 });
  }

  const canSubmit =
    activeTab === "genel" ||
    activeTab === "ozellikler" ||
    activeTab === "meta" ||
    activeTab === "personel" ||
    activeTab === "kurallar" ||
    activeTab === "konum";

  function submitForm(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (activeTab === "genel") {
          const result = await updateVillaGeneral(villa.id, formData);
          if (!result.success) {
            setError(result.error);
            return;
          }
        } else if (activeTab === "ozellikler") {
          await updateVillaFeatures(villa.id, formData);
        } else if (activeTab === "meta") {
          await updateVillaMetaSeo(villa.id, formData);
        } else if (activeTab === "personel") {
          await updateVillaPersonel(villa.id, formData);
        } else if (activeTab === "kurallar") {
          await updateVillaRules(villa.id, formData);
        } else if (activeTab === "konum") {
          await updateVillaLocation(villa.id, formData);
        }
        setBedroomReduceConfirm(null);
        router.push(returnPath);
      } catch (err) {
        setError(formatSubmitError(err));
      }
    });
  }

  function handleSubmit(formData: FormData) {
    if (activeTab === "genel") {
      const name = String(formData.get("name") ?? "").trim();
      if (!name) {
        setError("Villa adı zorunludur");
        return;
      }

      const newBedrooms = parseInt(String(formData.get("bedrooms") ?? ""), 10);
      if (Number.isFinite(newBedrooms) && newBedrooms < rooms.length) {
        setBedroomReduceConfirm({
          formData,
          newBedroomCount: newBedrooms,
        });
        return;
      }
    }

    if (activeTab === "konum") {
      const regionId = String(formData.get("regionId") ?? "").trim();
      if (!regionId) {
        setError("Mahalle / mevki seçimi zorunludur");
        return;
      }
    }

    submitForm(formData);
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/villalar"
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Link>
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Villa Düzenle
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">{villa.name}</h1>
          {villa.villaId != null ? (
            <p className="mt-2 inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-600">
              Villa ID
              <span className="ml-2 font-semibold tabular-nums text-gray-900">
                {villa.villaId}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex items-start gap-4">
          {showcaseImage ? (
            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm">
              <GalleryImage
                src={showcaseImage}
                alt={`${villa.name} vitrin`}
                fill
                className="object-cover"
                sizes="112px"
                priority
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Link
              href={villaTakvimPath(villa)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <CalendarDays className="h-4 w-4" />
              Takvim
            </Link>
            <Link
              href={villaPublicPath(villa.slug)}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Mağazada Görüntüle
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="shrink-0 border-b border-gray-200 bg-white px-6">
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={`cursor-pointer border-b-2 px-4 py-4 text-sm font-medium transition ${
                    isActive
                      ? "border-teal-600 text-teal-700"
                      : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-700"
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
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {activeTab === "genel" ? (
              <VillaGeneralTab
                villa={villa}
                regionBreadcrumb={regionBreadcrumb}
                roomCount={rooms.length}
                bedroomDraft={bedroomDraft}
                onBedroomsChange={setBedroomDraft}
              />
            ) : null}
            {activeTab === "galeri" ? (
              <VillaGalleryTab
                villaId={villa.id}
                villaName={villa.name}
                initialImages={galleryImages}
              />
            ) : null}
            {activeTab === "odalar" ? (
              <VillaRoomsTab
                villaId={villa.id}
                villaName={villa.name}
                bedroomCount={bedroomDraft}
                rooms={rooms}
                galleryImages={galleryImages}
              />
            ) : null}
            {activeTab === "ozellikler" ? (
              <VillaFeaturesTab
                villa={villa}
                pools={pools}
                amenityCategories={amenityCategories}
                facilityCategories={facilityCategories}
                priceInclusionItems={priceInclusionItems}
              />
            ) : null}
            {activeTab === "konum" ? (
              <VillaLocationTab
                villa={villa}
                regions={locationRegions}
                surroundingLocations={surroundingLocations}
                distanceByLocationId={distanceByLocationId}
              />
            ) : null}
            {activeTab === "kurallar" ? (
              <VillaRulesTab
                villa={villa}
                prepaymentPaymentTypes={prepaymentPaymentTypes}
              />
            ) : null}
            {activeTab === "personel" ? (
              <VillaPersonelTab
                ref={personelTabRef}
                villa={villa}
                activeOwners={activeOwners}
                provinces={provinces}
                onOpenOwnerModal={() => setOwnerModalOpen(true)}
              />
            ) : null}
            {activeTab === "ical" ? (
              <VillaIcalTab villaId={villa.id} data={icalData} />
            ) : null}
            {activeTab === "meta" ? (
              <VillaMetaSeoTab villa={villa} previewDomain={previewDomain} />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <Link
              href="/admin/villalar"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Link>
            <Link
              href={returnPath}
              className="cursor-pointer rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={isPending || !canSubmit}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Kaydediliyor..." : "Güncelle"}
            </button>
          </div>
        </form>
      </div>

      {ownerModalOpen ? (
        <VillaOwnerFormModal
          key="villa-owner-create"
          provinces={provinces}
          onClose={() => setOwnerModalOpen(false)}
          onCreated={async (ownerId) => {
            await personelTabRef.current?.assignCreatedOwner(ownerId);
          }}
        />
      ) : null}

      <VillaBedroomReduceModal
        open={bedroomReduceConfirm !== null}
        currentRoomCount={rooms.length}
        newBedroomCount={bedroomReduceConfirm?.newBedroomCount ?? 0}
        isPending={isPending}
        onCancel={() => setBedroomReduceConfirm(null)}
        onConfirm={() => {
          if (bedroomReduceConfirm) {
            submitForm(bedroomReduceConfirm.formData);
          }
        }}
      />
    </div>
  );
}
