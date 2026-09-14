"use client";

import { useState, useTransition } from "react";
import { saveCarRentalPageSettings } from "@/app/actions/admin/car-rental";
import type { CarRentalPageSettingsData } from "@/lib/queries/car-rental";
import { parseDriverAgeOptions } from "@/lib/queries/car-rental";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

export default function CarRentalSearchSettingsForm({
  settings,
}: {
  settings: CarRentalPageSettingsData;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await saveCarRentalPageSettings({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOk(true);
    });
  }

  const ageOptionsText = parseDriverAgeOptions(
    settings.driverAgeOptionsJson
  ).join("\n");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
          Araç Kiralama
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Arama Çubuğu</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Public araç kiralama sayfasındaki hero, arama alanları ve bölüm
          başlıklarını yönetin.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Ayarlar kaydedildi.
        </div>
      ) : null}

      <form action={onSubmit} className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Hero</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-gray-500">Rozet</span>
              <input
                name="heroBadge"
                required
                defaultValue={settings.heroBadge}
                className={inputClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-gray-500">Başlık</span>
              <input
                name="heroTitle"
                required
                defaultValue={settings.heroTitle}
                className={inputClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-gray-500">Alt metin</span>
              <textarea
                name="heroSubtitle"
                rows={3}
                required
                defaultValue={settings.heroSubtitle}
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Arama alanları</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Aynı nokta etiketi
              </span>
              <input
                name="sameLocationLabel"
                required
                defaultValue={settings.sameLocationLabel}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Toggle varsayılan
              </span>
              <select
                name="sameLocationDefault"
                defaultValue={settings.sameLocationDefault ? "true" : "false"}
                className={inputClass}
              >
                <option value="true">Açık</option>
                <option value="false">Kapalı</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Toggle göster
              </span>
              <select
                name="showSameLocationToggle"
                defaultValue={
                  settings.showSameLocationToggle ? "true" : "false"
                }
                className={inputClass}
              >
                <option value="true">Evet</option>
                <option value="false">Hayır</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Alış noktası etiketi
              </span>
              <input
                name="pickupLabel"
                required
                defaultValue={settings.pickupLabel}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Teslim noktası etiketi
              </span>
              <input
                name="returnLabel"
                required
                defaultValue={settings.returnLabel}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Kiralama ipucu
              </span>
              <input
                name="rentalDaysHint"
                defaultValue={settings.rentalDaysHint}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Alış tarihi etiketi
              </span>
              <input
                name="pickupDateLabel"
                required
                defaultValue={settings.pickupDateLabel}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Teslim tarihi etiketi
              </span>
              <input
                name="returnDateLabel"
                required
                defaultValue={settings.returnDateLabel}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Sürücü yaşı etiketi
              </span>
              <input
                name="driverAgeLabel"
                required
                defaultValue={settings.driverAgeLabel}
                className={inputClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-gray-500">
                Sürücü yaşı seçenekleri (satır satır)
              </span>
              <textarea
                name="driverAgeOptionsText"
                rows={4}
                required
                defaultValue={ageOptionsText}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Varsayılan yaş
              </span>
              <input
                name="defaultDriverAge"
                required
                defaultValue={settings.defaultDriverAge}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">CTA metni</span>
              <input
                name="ctaText"
                required
                defaultValue={settings.ctaText}
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Bölüm başlıkları</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Kategoriler başlık
              </span>
              <input
                name="categoriesTitle"
                required
                defaultValue={settings.categoriesTitle}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Kategoriler alt
              </span>
              <input
                name="categoriesSubtitle"
                defaultValue={settings.categoriesSubtitle}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Lokasyonlar başlık
              </span>
              <input
                name="locationsTitle"
                required
                defaultValue={settings.locationsTitle}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Lokasyonlar alt
              </span>
              <input
                name="locationsSubtitle"
                defaultValue={settings.locationsSubtitle}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Kriterler başlık
              </span>
              <input
                name="criteriaTitle"
                required
                defaultValue={settings.criteriaTitle}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">
                Kriterler alt
              </span>
              <input
                name="criteriaSubtitle"
                defaultValue={settings.criteriaSubtitle}
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {isPending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>
    </div>
  );
}
