"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Villa } from "@prisma/client";
import StatusPillToggle from "@/components/admin/villas/StatusPillToggle";
import {
  resolveAllowBabyDefault,
  resolveAllowChildrenDefault,
  resolvePrepaymentPaymentTypeId,
} from "@/lib/villa-rules-defaults";
import { VILLA_NATURE_PEST_NOTICE } from "@/lib/villa-nature-pest-notice";
import { amenitiesAllowPets } from "@/lib/villa-pets-amenity";

interface PrepaymentPaymentTypeOption {
  id: string;
  name: string;
}

interface VillaRulesTabProps {
  villa: Villa;
  prepaymentPaymentTypes: PrepaymentPaymentTypeOption[];
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const labelClass = "text-xs font-medium text-gray-500";

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

export default function VillaRulesTab({
  villa,
  prepaymentPaymentTypes,
}: VillaRulesTabProps) {
  const defaultPrepaymentId = useMemo(
    () =>
      resolvePrepaymentPaymentTypeId(
        villa.prepaymentPaymentTypeId,
        prepaymentPaymentTypes
      ),
    [villa.prepaymentPaymentTypeId, prepaymentPaymentTypes]
  );

  const [allowBaby, setAllowBaby] = useState(
    resolveAllowBabyDefault(villa.allowBaby)
  );
  const [allowChildren, setAllowChildren] = useState(
    resolveAllowChildrenDefault(villa.allowChildren)
  );
  const [allowEvents, setAllowEvents] = useState(villa.allowEvents);
  const [allowSmoking, setAllowSmoking] = useState(villa.allowSmoking);
  const [allowPets, setAllowPets] = useState(
    villa.allowPets || amenitiesAllowPets(villa.amenities)
  );
  const [allowPrepaymentOption, setAllowPrepaymentOption] = useState(
    villa.allowPrepaymentOption !== false
  );
  const [allowFullPaymentOption, setAllowFullPaymentOption] = useState(
    villa.allowFullPaymentOption === true
  );
  const [showNaturePestNotice, setShowNaturePestNotice] = useState(
    villa.showNaturePestNotice
  );
  const [customRules, setCustomRules] = useState(villa.customRules);
  const [customRuleInput, setCustomRuleInput] = useState("");

  function addCustomRule() {
    const value = customRuleInput.trim();
    if (!value) return;
    if (customRules.includes(value)) {
      setCustomRuleInput("");
      return;
    }
    setCustomRules((prev) => [...prev, value]);
    setCustomRuleInput("");
  }

  function removeCustomRule(rule: string) {
    setCustomRules((prev) => prev.filter((item) => item !== rule));
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Ödeme Ayarları">
        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <label className="block">
            <span className={labelClass}>Ön Ödeme Farkı Ödeme Tipi</span>
            <p className="mb-2 mt-1 text-xs text-gray-500">
              Rezervasyonda &apos;Ev Sahibi Ödeme&apos; sekmesinde &apos;Ödeme
              Yapılacak Tarih&apos;i otomatik önerir.
            </p>
            <select
              name="prepaymentPaymentTypeId"
              defaultValue={defaultPrepaymentId}
              className={inputClass}
            >
              {prepaymentPaymentTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className={labelClass}>Ödeme Bilgisi</span>
            <p className="mb-2 mt-1 text-xs text-gray-500">
              Rezervasyon Yap ödeme ekranında görünecek tutar seçenekleri.
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusPillToggle
                label="Ön Ödeme"
                name="allowPrepaymentOption"
                checked={allowPrepaymentOption}
                onChange={(value) => {
                  if (!value && !allowFullPaymentOption) return;
                  setAllowPrepaymentOption(value);
                }}
              />
              <StatusPillToggle
                label="Tam Ödeme"
                name="allowFullPaymentOption"
                checked={allowFullPaymentOption}
                onChange={(value) => {
                  if (!value && !allowPrepaymentOption) return;
                  setAllowFullPaymentOption(value);
                }}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Ev Kuralları">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Check-in Saati</span>
            <input
              name="checkInTime"
              type="time"
              defaultValue={villa.checkInTime || "16:00"}
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Check-out Saati</span>
            <input
              name="checkOutTime"
              type="time"
              defaultValue={villa.checkOutTime || "10:00"}
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPillToggle
            label="Bebeğe İzin Verilir (0-2 Yaş)"
            name="allowBaby"
            checked={allowBaby}
            onChange={setAllowBaby}
          />
          <StatusPillToggle
            label="Çocuğa İzin Verilir (3-12 Yaş)"
            name="allowChildren"
            checked={allowChildren}
            onChange={setAllowChildren}
          />
          <StatusPillToggle
            label="Etkinliğe İzin Verilir"
            name="allowEvents"
            checked={allowEvents}
            onChange={setAllowEvents}
          />
          <StatusPillToggle
            label="Sigara İçmeye İzin Verilir"
            name="allowSmoking"
            checked={allowSmoking}
            onChange={setAllowSmoking}
          />
          <StatusPillToggle
            label="Evcil Hayvana İzin Verilir"
            name="allowPets"
            checked={allowPets}
            onChange={setAllowPets}
          />
        </div>
      </SectionCard>

      <SectionCard title="Böcek / İlaçlama Bilgilendirmesi">
        <p className="mb-4 text-xs text-gray-500">
          Villa detay sayfasında &quot;Bilmeniz Gerekenler&quot; bölümünün en
          altında gösterilir. Yeni villalarda varsayılan olarak açıktır.
        </p>
        <StatusPillToggle
          label="Villa detayında göster"
          name="showNaturePestNotice"
          checked={showNaturePestNotice}
          onChange={setShowNaturePestNotice}
        />
        <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">
            {VILLA_NATURE_PEST_NOTICE.title}
          </p>
          <p>{VILLA_NATURE_PEST_NOTICE.intro}</p>
          {VILLA_NATURE_PEST_NOTICE.items.map((item) => (
            <p key={item.label}>
              <span className="font-semibold text-gray-900">{item.label}:</span>{" "}
              {item.text}
            </p>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Özel Kurallar">
        <div className="flex gap-2">
          <input
            type="text"
            value={customRuleInput}
            onChange={(event) => setCustomRuleInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomRule();
              }
            }}
            placeholder="Örn: Düğün/etkinlik için ek temizlik ücreti alınır"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addCustomRule}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Ekle
          </button>
        </div>

        {customRules.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {customRules.map((rule) => (
              <li
                key={rule}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800"
              >
                <span>{rule}</span>
                <button
                  type="button"
                  onClick={() => removeCustomRule(rule)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Sil
                </button>
                <input type="hidden" name="customRules" value={rule} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Henüz özel kural eklenmedi.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
