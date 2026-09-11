"use client";

import { useState, useTransition } from "react";
import type { PoolMeasureUnit, VillaPool } from "@prisma/client";
import { CalendarRange, Pencil, Plus, Waves, X } from "lucide-react";
import {
  createVillaPool,
  deleteVillaPool,
  updateVillaPool,
} from "@/app/actions/admin/villa-pools";
import {
  poolPurificationOptions,
  poolTypeOptions,
} from "@/lib/villa-pool-options";
import VillaPoolPeriodsModal, {
  type PoolPeriodItem,
} from "@/components/admin/villas/VillaPoolPeriodsModal";

export type VillaPoolWithPeriods = VillaPool & {
  periods: PoolPeriodItem[];
};

interface VillaPoolManagerProps {
  villaId: string;
  pools: VillaPoolWithPeriods[];
}

type EditorMode = "create" | "edit";

interface EditorState {
  mode: EditorMode;
  poolId?: string;
  measureUnit: PoolMeasureUnit;
  width: string;
  length: string;
  depth: string;
  poolType: string;
  purificationMethod: string;
  heated: boolean;
  conservative: boolean;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100";

const labelClass = "text-xs font-medium text-gray-500";

const buttonClass = "cursor-pointer";

function formatDimensions(pool: VillaPool) {
  const unit = pool.measureUnit === "CM" ? "cm" : "m";
  const parts = [pool.width, pool.length, pool.depth].map((value) =>
    value == null ? "—" : String(value)
  );
  return `${parts.join(" x ")} ${unit}`;
}

function emptyEditor(): EditorState {
  return {
    mode: "create",
    measureUnit: "CM",
    width: "",
    length: "",
    depth: "",
    poolType: "",
    purificationMethod: "Klor",
    heated: false,
    conservative: false,
  };
}

function editorFromPool(pool: VillaPool): EditorState {
  return {
    mode: "edit",
    poolId: pool.id,
    measureUnit: pool.measureUnit,
    width: pool.width == null ? "" : String(pool.width),
    length: pool.length == null ? "" : String(pool.length),
    depth: pool.depth == null ? "" : String(pool.depth),
    poolType: pool.poolType || "",
    purificationMethod: pool.purificationMethod || "",
    heated: pool.heated,
    conservative: pool.conservative,
  };
}

function FeatureToggle({
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
      className={`${buttonClass} inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition sm:flex-none ${
        active
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-gray-300"
        }`}
      />
      {label}
    </button>
  );
}

export default function VillaPoolManager({
  villaId,
  pools,
}: VillaPoolManagerProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [periodsPoolId, setPeriodsPoolId] = useState<string | null>(null);

  const periodsPool = periodsPoolId
    ? pools.find((pool) => pool.id === periodsPoolId) ?? null
    : null;

  function openCreate() {
    setError(null);
    setEditor(emptyEditor());
  }

  function openEdit(pool: VillaPool) {
    setError(null);
    setEditor(editorFromPool(pool));
  }

  function closeEditor() {
    setEditor(null);
    setError(null);
  }

  function updateEditor<K extends keyof EditorState>(
    key: K,
    value: EditorState[K]
  ) {
    setEditor((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleSave() {
    if (!editor) return;

    setError(null);
    const formData = new FormData();
    formData.set("villaId", villaId);
    formData.set("measureUnit", editor.measureUnit);
    formData.set("heated", editor.heated ? "true" : "false");
    formData.set("conservative", editor.conservative ? "true" : "false");
    formData.set("poolType", editor.poolType);
    formData.set("purificationMethod", editor.purificationMethod);
    formData.set("width", editor.width);
    formData.set("length", editor.length);
    formData.set("depth", editor.depth);

    if (editor.mode === "edit" && editor.poolId) {
      formData.set("poolId", editor.poolId);
    }

    const mode = editor.mode;

    startTransition(async () => {
      const result =
        mode === "edit"
          ? await updateVillaPool(formData)
          : await createVillaPool(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      closeEditor();
    });
  }

  function handleDelete(poolId: string) {
    if (!window.confirm("Bu havuz kaydını silmek istiyor musunuz?")) return;
    if (editor?.poolId === poolId) closeEditor();
    if (periodsPoolId === poolId) setPeriodsPoolId(null);

    startTransition(async () => {
      await deleteVillaPool(poolId, villaId);
    });
  }

  const unitLabel = editor?.measureUnit === "CM" ? "cm" : "m";
  const canAdd = !isPending && !editor;

  return (
    <div className="space-y-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-800">Havuz Bilgileri</h2>
        <button
          type="button"
          onClick={openCreate}
          disabled={!canAdd}
          className={`${buttonClass} inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3.5 py-1.5 text-sm font-semibold text-sky-700 shadow-sm ring-1 ring-sky-200/80 transition hover:bg-sky-100 hover:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Havuz Ekle
        </button>
      </div>

      {pools.length === 0 && editor?.mode !== "create" ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-6 text-center text-sm text-gray-500">
          Henüz havuz eklenmemiş.
        </p>
      ) : null}

      {pools.map((pool) => {
        const isActive = editor?.mode === "edit" && editor.poolId === pool.id;
        const periodsEnabled = pool.heated;

        return (
          <div key={pool.id} className="space-y-3">
            <div
              className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 ${
                isActive ? "border-violet-200 shadow-sm" : "border-gray-200"
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Waves className="h-5 w-5" strokeWidth={2} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {pool.poolType || "Havuz"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {formatDimensions(pool)}
                  </span>
                  {pool.purificationMethod ? (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                      {pool.purificationMethod}
                    </span>
                  ) : null}
                  {pool.heated ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                      Isıtmalı
                    </span>
                  ) : null}
                  {pool.conservative ? (
                    <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-600">
                      Muhafazakar
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPeriodsPoolId(pool.id)}
                  disabled={!periodsEnabled || isPending}
                  title={
                    periodsEnabled
                      ? "Havuz periyotlarını yönet"
                      : "Isıtma işaretli değil"
                  }
                  className={`${buttonClass} inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    periodsEnabled
                      ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                      : "border-gray-200 bg-gray-50 text-gray-400"
                  }`}
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Havuz Periyotları</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(pool)}
                  disabled={isPending}
                  aria-label="Havuzu düzenle"
                  className={`${buttonClass} inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(pool.id)}
                  disabled={isPending}
                  aria-label="Havuzu sil"
                  className={`${buttonClass} inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {isActive && editor ? (
              <PoolEditorForm
                editor={editor}
                error={error}
                isPending={isPending}
                isEditing
                unitLabel={unitLabel}
                onClose={closeEditor}
                onSave={handleSave}
                onUpdate={updateEditor}
              />
            ) : null}
          </div>
        );
      })}

      {editor?.mode === "create" ? (
        <PoolEditorForm
          editor={editor}
          error={error}
          isPending={isPending}
          isEditing={false}
          unitLabel={unitLabel}
          onClose={closeEditor}
          onSave={handleSave}
          onUpdate={updateEditor}
        />
      ) : null}

      {periodsPool ? (
        <VillaPoolPeriodsModal
          open
          villaId={villaId}
          poolId={periodsPool.id}
          poolLabel={periodsPool.poolType || "Havuz"}
          periods={periodsPool.periods}
          onClose={() => setPeriodsPoolId(null)}
        />
      ) : null}
    </div>
  );
}

function PoolEditorForm({
  editor,
  error,
  isPending,
  isEditing,
  unitLabel,
  onClose,
  onSave,
  onUpdate,
}: {
  editor: EditorState;
  error: string | null;
  isPending: boolean;
  isEditing: boolean;
  unitLabel: string;
  onClose: () => void;
  onSave: () => void;
  onUpdate: <K extends keyof EditorState>(
    key: K,
    value: EditorState[K]
  ) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-xs font-bold tracking-wide text-gray-400 uppercase">
        {isEditing ? "Havuz Düzenle" : "Yeni Havuz"}
      </p>

      {error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Nested <form> kullanılamaz: üst VillaEditForm zaten bir form sarıyor. */}
      <div className="space-y-4">
        <div>
          <span className={labelClass}>Ölçü Birimi</span>
          <div className="mt-2 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {(["M", "CM"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => onUpdate("measureUnit", unit)}
                className={`${buttonClass} rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  editor.measureUnit === unit
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-white"
                }`}
              >
                {unit === "M" ? "m" : "cm"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Havuz Tipi</span>
            <select
              value={editor.poolType}
              onChange={(event) => onUpdate("poolType", event.target.value)}
              className={`mt-1.5 ${buttonClass} ${inputClass}`}
            >
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
              value={editor.purificationMethod}
              onChange={(event) =>
                onUpdate("purificationMethod", event.target.value)
              }
              className={`mt-1.5 ${buttonClass} ${inputClass}`}
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

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className={labelClass}>Genişlik ({unitLabel})</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editor.width}
              onChange={(event) => onUpdate("width", event.target.value)}
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Uzunluk ({unitLabel})</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editor.length}
              onChange={(event) => onUpdate("length", event.target.value)}
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Derinlik ({unitLabel})</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editor.depth}
              onChange={(event) => onUpdate("depth", event.target.value)}
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <FeatureToggle
            label="Isıtma"
            active={editor.heated}
            onClick={() => onUpdate("heated", !editor.heated)}
          />
          <FeatureToggle
            label="Muhafazakar"
            active={editor.conservative}
            onClick={() => onUpdate("conservative", !editor.conservative)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className={`${buttonClass} rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50`}
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className={`${buttonClass} rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isPending
              ? isEditing
                ? "Güncelleniyor..."
                : "Ekleniyor..."
              : isEditing
                ? "Güncelle"
                : "Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}
