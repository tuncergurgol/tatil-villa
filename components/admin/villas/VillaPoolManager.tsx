"use client";

import { useState, useTransition } from "react";
import type { PoolMeasureUnit, VillaPool } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import {
  createVillaPool,
  deleteVillaPool,
} from "@/app/actions/admin/villa-pools";
import {
  poolPurificationOptions,
  poolTypeOptions,
} from "@/lib/villa-pool-options";

interface VillaPoolManagerProps {
  villaId: string;
  pools: VillaPool[];
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const labelClass = "text-xs font-medium text-gray-500";

function formatDimension(value: number | null, unit: PoolMeasureUnit) {
  if (value == null) return "—";
  const suffix = unit === "CM" ? "cm" : "m";
  return `${value} ${suffix}`;
}

function PoolToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-5 py-2.5 text-sm font-medium transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

export default function VillaPoolManager({
  villaId,
  pools,
}: VillaPoolManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [measureUnit, setMeasureUnit] = useState<PoolMeasureUnit>("M");
  const [heated, setHeated] = useState(false);
  const [conservative, setConservative] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setHeated(false);
    setConservative(false);
    setMeasureUnit("M");
    setError(null);
  }

  function handleAdd(formData: FormData) {
    setError(null);
    formData.set("villaId", villaId);
    formData.set("measureUnit", measureUnit);
    formData.set("heated", heated ? "true" : "false");
    formData.set("conservative", conservative ? "true" : "false");

    startTransition(async () => {
      const result = await createVillaPool(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      resetForm();
    });
  }

  function handleDelete(poolId: string) {
    if (!window.confirm("Bu havuz kaydını silmek istiyor musunuz?")) return;
    startTransition(async () => {
      await deleteVillaPool(poolId, villaId);
    });
  }

  const unitLabel = measureUnit === "CM" ? "cm" : "m";

  return (
    <div className="space-y-4">
      {pools.length > 0 ? (
        <div className="space-y-3">
          {pools.map((pool, index) => (
            <div
              key={pool.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Havuz {index + 1}
                  {pool.poolType ? ` · ${pool.poolType}` : ""}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {formatDimension(pool.width, pool.measureUnit)} ×{" "}
                  {formatDimension(pool.length, pool.measureUnit)} ×{" "}
                  {formatDimension(pool.depth, pool.measureUnit)}
                  {pool.purificationMethod
                    ? ` · ${pool.purificationMethod}`
                    : ""}
                  {pool.heated ? " · Isıtmalı" : ""}
                  {pool.conservative ? " · Muhafazakar" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(pool.id)}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Henüz havuz eklenmemiş.</p>
      )}

      {showForm ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-xs font-bold tracking-wide text-gray-400 uppercase">
            Yeni Havuz
          </p>

          {error ? (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <form action={handleAdd} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Havuz Tipi</span>
                <select name="poolType" className={`mt-1.5 ${inputClass}`}>
                  <option value="">Seçiniz</option>
                  {poolTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Arıtma Yöntemi</span>
                <select
                  name="purificationMethod"
                  className={`mt-1.5 ${inputClass}`}
                >
                  <option value="">Seçiniz</option>
                  {poolPurificationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <span className={labelClass}>Ölçü Birimi</span>
              <div className="mt-2 inline-flex rounded-xl border border-gray-200 p-1">
                {(["M", "CM"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setMeasureUnit(unit)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                      measureUnit === unit
                        ? "bg-violet-600 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {unit === "M" ? "m" : "cm"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className={labelClass}>Genişlik ({unitLabel})</span>
                <input
                  name="width"
                  type="number"
                  step="0.01"
                  min="0"
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Uzunluk ({unitLabel})</span>
                <input
                  name="length"
                  type="number"
                  step="0.01"
                  min="0"
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Derinlik ({unitLabel})</span>
                <input
                  name="depth"
                  type="number"
                  step="0.01"
                  min="0"
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <PoolToggleButton
                label="Havuz Isıtma"
                active={heated}
                onClick={() => setHeated((value) => !value)}
              />
              <PoolToggleButton
                label="Muhafazakar"
                active={conservative}
                onClick={() => setConservative((value) => !value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
        >
          <Plus className="h-4 w-4" />
          Havuz Ekle
        </button>
      )}
    </div>
  );
}
