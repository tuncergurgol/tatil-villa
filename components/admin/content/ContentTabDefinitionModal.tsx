"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, X } from "lucide-react";
import {
  deleteCmsContentTabAction,
  saveCmsContentTabAction,
} from "@/app/actions/admin/cms-content";
import {
  CmsField,
  cmsInputClass,
} from "@/components/admin/content/CmsFormSections";

export type ContentTabDefinition = {
  id: string;
  key: string;
  name: string;
  moduleKey: string;
  sortOrder: number;
  active: boolean;
};

export const CONTENT_TAB_MODULES = [
  { value: "sss", label: "Sık Sorulan Sorular" },
  { value: "blog", label: "Blog" },
  { value: "kurumsal", label: "Kurumsal" },
  { value: "menuler", label: "Menüler" },
  { value: "kampanyalar", label: "Kampanyalar" },
  { value: "custom", label: "Özel (boş panel)" },
] as const;

type ContentTabDefinitionModalProps = {
  open: boolean;
  mode: "create" | "edit";
  tab?: ContentTabDefinition | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ContentTabDefinitionModal({
  open,
  mode,
  tab = null,
  onClose,
  onSaved,
}: ContentTabDefinitionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [moduleKey, setModuleKey] = useState("custom");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && tab) {
      setName(tab.name);
      setSortOrder(String(tab.sortOrder));
      setModuleKey(tab.moduleKey || "custom");
      setActive(tab.active);
    } else {
      setName("");
      setSortOrder("0");
      setModuleKey("custom");
      setActive(true);
    }
  }, [open, mode, tab]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("sortOrder", sortOrder);
    formData.set("active", active ? "true" : "false");
    formData.set("moduleKey", moduleKey);

    startTransition(async () => {
      const result = await saveCmsContentTabAction(
        mode === "edit" && tab ? tab.id : null,
        formData
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  }

  function handleDelete() {
    if (!tab || mode !== "edit") return;
    if (
      !confirm(`"${tab.name}" sekmesi silinsin mi? Bu işlem geri alınamaz.`)
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteCmsContentTabAction(tab.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-tab-modal-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-gray-500" />
            <h2
              id="content-tab-modal-title"
              className="text-base font-semibold text-gray-900"
            >
              {mode === "edit" ? "Sekme Tanımlama" : "Yeni Sekme Ekle"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <CmsField label="Sekme Adı">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              className={cmsInputClass}
              placeholder="Örn. Kampanyalar"
            />
          </CmsField>

          <CmsField label="Sıra Numarası">
            <input
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              required
              className={cmsInputClass}
            />
          </CmsField>

          <CmsField label="İçerik Tipi">
            <select
              value={moduleKey}
              onChange={(event) => setModuleKey(event.target.value)}
              className={`cursor-pointer ${cmsInputClass}`}
            >
              {CONTENT_TAB_MODULES.map((module) => (
                <option key={module.value} value={module.value}>
                  {module.label}
                </option>
              ))}
            </select>
          </CmsField>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">
              {active ? "Aktif" : "Pasif"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive((value) => !value)}
              className={`relative h-7 w-12 cursor-pointer rounded-full transition ${
                active ? "bg-teal-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div
            className={`flex gap-2 pt-1 ${
              mode === "edit" ? "items-center justify-between" : "justify-end"
            }`}
          >
            {mode === "edit" ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="cursor-pointer rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending
                  ? "Kaydediliyor..."
                  : mode === "edit"
                    ? "Güncelle"
                    : "Ekle"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
