"use client";

import { useState } from "react";
import type { Villa, VillaCategory } from "@prisma/client";
import { Sparkles } from "lucide-react";
import VillaAiDescriptionModal from "@/components/admin/villas/VillaAiDescriptionModal";
import VillaBedroomMismatchAlert from "@/components/admin/villas/VillaBedroomMismatchAlert";
import RichTextEditor from "@/components/admin/villas/RichTextEditor";
import StatusPillToggle from "@/components/admin/villas/StatusPillToggle";
import { facilityTypeOptions } from "@/lib/facility-type";
import { salesTypeOptions } from "@/lib/sales-type";

interface VillaGeneralTabProps {
  villa: VillaGeneralFormValue;
  regionBreadcrumb: string;
  roomCount: number;
  bedroomDraft: number;
  onBedroomsChange: (value: number) => void;
  aiEnabled?: boolean;
}

export type VillaGeneralFormValue = Pick<
  Villa,
  | "id"
  | "villaId"
  | "name"
  | "originalName"
  | "category"
  | "salesType"
  | "guests"
  | "extraCapacity"
  | "livingRooms"
  | "bedrooms"
  | "bathrooms"
  | "active"
  | "showInSearch"
  | "showInOffer"
  | "ribbonText1"
  | "ribbonText2"
  | "description"
  | "amenities"
  | "allowChildren"
>;

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {hint ? (
        <span className="mt-0.5 block text-[11px] text-gray-400">{hint}</span>
      ) : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

export default function VillaGeneralTab({
  villa,
  regionBreadcrumb,
  roomCount,
  bedroomDraft,
  onBedroomsChange,
  aiEnabled = true,
}: VillaGeneralTabProps) {
  const [active, setActive] = useState(villa.active);
  const [showInSearch, setShowInSearch] = useState(villa.showInSearch);
  const [showInOffer, setShowInOffer] = useState(villa.showInOffer);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [description, setDescription] = useState(villa.description);
  const [descriptionKey, setDescriptionKey] = useState(0);

  return (
    <div className="space-y-8">
      <VillaBedroomMismatchAlert
        bedroomCount={bedroomDraft}
        roomCount={roomCount}
      />

      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-800">
          Temel Bilgiler
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Villa Adı">
            <input
              name="name"
              required
              defaultValue={villa.name}
              className={inputClass}
            />
          </Field>
          <Field label="Orijinal Adı">
            <input
              name="originalName"
              defaultValue={villa.originalName}
              className={inputClass}
            />
          </Field>
          {villa.villaId != null ? (
            <Field label="Villa ID">
              <input
                readOnly
                value={String(villa.villaId)}
                className={`${inputClass} cursor-default bg-gray-100 text-gray-600`}
              />
            </Field>
          ) : null}
          <Field label="Ev Tipi">
            <select
              name="category"
              defaultValue={villa.category ?? "villa"}
              className={inputClass}
            >
              {facilityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Satış Türü">
            <select
              name="salesType"
              defaultValue={villa.salesType}
              className={inputClass}
            >
              {salesTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kişi kapasite">
            <input
              name="guests"
              type="number"
              min={1}
              required
              defaultValue={villa.guests}
              className={inputClass}
            />
          </Field>
          <Field label="Ekstra kapasite">
            <input
              name="extraCapacity"
              type="number"
              min={0}
              defaultValue={villa.extraCapacity}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-5">
          <span className="text-xs font-medium text-gray-500">Odalar</span>
          <div className="mt-1.5 grid grid-cols-3 gap-3">
            <Field label="Salon">
              <input
                name="livingRooms"
                type="number"
                min={0}
                defaultValue={villa.livingRooms}
                className={inputClass}
              />
            </Field>
            <Field label="Yatak Odası">
              <input
                name="bedrooms"
                type="number"
                min={0}
                required
                value={bedroomDraft}
                onChange={(event) => {
                  const parsed = parseInt(event.target.value, 10);
                  onBedroomsChange(Number.isFinite(parsed) ? parsed : 0);
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Banyo">
              <input
                name="bathrooms"
                type="number"
                min={0}
                required
                defaultValue={villa.bathrooms}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPillToggle
            label="Yayın Durumu"
            name="active"
            checked={active}
            onChange={setActive}
          />
          <StatusPillToggle
            label="Arama Alanında Görünür"
            name="showInSearch"
            checked={showInSearch}
            onChange={setShowInSearch}
          />
          <StatusPillToggle
            label="Teklif Alanında Görünür"
            name="showInOffer"
            checked={showInOffer}
            onChange={setShowInOffer}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-800">
          Ribbon Etiketleri
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ribbon Text 1">
            <input
              name="ribbonText1"
              defaultValue={villa.ribbonText1}
              className={inputClass}
            />
          </Field>
          <Field label="Ribbon Text 2">
            <input
              name="ribbonText2"
              defaultValue={villa.ribbonText2}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-800">
            Villa Açıklaması
          </h2>
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            disabled={!aiEnabled}
            title={
              aiEnabled
                ? undefined
                : "AI açıklaması villa ilk kez kaydedildikten sonra kullanılabilir"
            }
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            AI ile Oluştur
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          * En iyi sonuç için önce tüm villa bilgilerini doldurun.
        </p>
        <RichTextEditor
          key={descriptionKey}
          name="description"
          defaultValue={description}
        />
      </section>

      <VillaAiDescriptionModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        villaId={villa.id}
        initialName={villa.name}
        initialRegion={regionBreadcrumb}
        formSnapshot={{
          guests: villa.guests,
          livingRooms: villa.livingRooms,
          bedrooms: villa.bedrooms,
          bathrooms: villa.bathrooms,
          amenityCount: villa.amenities.length,
          childFriendly: villa.allowChildren,
          facilityType: villa.category as VillaCategory,
        }}
        onGenerated={(generated) => {
          setDescription(generated);
          setDescriptionKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}
