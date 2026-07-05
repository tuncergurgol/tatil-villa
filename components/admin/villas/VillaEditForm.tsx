"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Villa, VillaOwner, VillaPool } from "@prisma/client";
import { ExternalLink, Save } from "lucide-react";
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
import VillaPersonelTab from "@/components/admin/villas/VillaPersonelTab";
import VillaRulesTab from "@/components/admin/villas/VillaRulesTab";
import type { AmenityCategoryItem } from "@/lib/queries/amenities";
import type { FacilityCategoryOption } from "@/lib/queries/facility-categories";
import type { PriceInclusionItem } from "@/lib/queries/price-inclusion";
import type { ActiveVillaOwnerOption } from "@/lib/queries/villa-owners";
import type {
  RegionPickerOption,
  SurroundingLocationOption,
} from "@/lib/queries/villa-location";
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
  pools: VillaPool[];
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
  const [activeTab, setActiveTab] = useState<TabId>("genel");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [bedroomDraft, setBedroomDraft] = useState(villa.bedrooms);
  const [bedroomReduceConfirm, setBedroomReduceConfirm] = useState<{
    formData: FormData;
    newBedroomCount: number;
  } | null>(null);

  useEffect(() => {
    setBedroomDraft(villa.bedrooms);
  }, [villa.bedrooms]);

  function switchTab(tabId: TabId) {
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
          await updateVillaGeneral(villa.id, formData);
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
        setError(err instanceof Error ? err.message : "Kayıt başarısız");
      }
    });
  }

  function handleSubmit(formData: FormData) {
    if (activeTab === "genel") {
      const newBedrooms = parseInt(String(formData.get("bedrooms") ?? ""), 10);
      if (Number.isFinite(newBedrooms) && newBedrooms < rooms.length) {
        setBedroomReduceConfirm({
          formData,
          newBedroomCount: newBedrooms,
        });
        return;
      }
    }

    submitForm(formData);
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
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
        <div className="flex items-center gap-4">
          {villa.image ? (
            <div className="relative h-20 w-28 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm">
              <Image
                src={villa.image}
                alt={`${villa.name} vitrin`}
                fill
                className="object-cover"
                sizes="112px"
                priority
              />
            </div>
          ) : null}
          <Link
            href={`/villalar/${villa.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Mağazada Görüntüle
            <ExternalLink className="h-4 w-4" />
          </Link>
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
                  className={`border-b-2 px-4 py-4 text-sm font-medium transition ${
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

            <div className={activeTab === "genel" ? "block" : "hidden"}>
              <VillaGeneralTab
                villa={villa}
                regionBreadcrumb={regionBreadcrumb}
                roomCount={rooms.length}
                bedroomDraft={bedroomDraft}
                onBedroomsChange={setBedroomDraft}
              />
            </div>
            <div className={activeTab === "galeri" ? "block" : "hidden"}>
              <VillaGalleryTab
                villaId={villa.id}
                villaName={villa.name}
                initialImages={galleryImages}
              />
            </div>
            <div className={activeTab === "odalar" ? "block" : "hidden"}>
              <VillaRoomsTab
                villaId={villa.id}
                villaName={villa.name}
                bedroomCount={bedroomDraft}
                rooms={rooms}
                galleryImages={galleryImages}
              />
            </div>
            <div className={activeTab === "ozellikler" ? "block" : "hidden"}>
              <VillaFeaturesTab
                villa={villa}
                pools={pools}
                amenityCategories={amenityCategories}
                facilityCategories={facilityCategories}
                priceInclusionItems={priceInclusionItems}
              />
            </div>
            <div className={activeTab === "konum" ? "block" : "hidden"}>
              <VillaLocationTab
                villa={villa}
                regions={locationRegions}
                surroundingLocations={surroundingLocations}
                distanceByLocationId={distanceByLocationId}
              />
            </div>
            <div className={activeTab === "kurallar" ? "block" : "hidden"}>
              <VillaRulesTab
                villa={villa}
                prepaymentPaymentTypes={prepaymentPaymentTypes}
              />
            </div>
            <div className={activeTab === "personel" ? "block" : "hidden"}>
              <VillaPersonelTab
                villa={villa}
                activeOwners={activeOwners}
                provinces={provinces}
              />
            </div>
            <div className={activeTab === "ical" ? "block" : "hidden"}>
              <VillaIcalTab villaId={villa.id} data={icalData} />
            </div>
            <div className={activeTab === "meta" ? "block" : "hidden"}>
              <VillaMetaSeoTab villa={villa} previewDomain={previewDomain} />
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <Link
              href={returnPath}
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={isPending || !canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Kaydediliyor..." : "Güncelle"}
            </button>
          </div>
        </form>
      </div>

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
