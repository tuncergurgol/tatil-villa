"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSiteMenuItemAction,
  saveSiteMenuItemAction,
} from "@/app/actions/admin/cms-content";
import { cmsInputClass } from "@/components/admin/content/CmsFormSections";

type MenuItem = {
  id: string;
  label: string;
  href: string;
  sortOrder: number;
  active: boolean;
  openInNewTab: boolean;
};

type Menu = {
  id: string;
  key: string;
  label: string;
  items: MenuItem[];
};

const menuGridClass =
  "grid grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_72px_88px_112px] lg:gap-4";

const menuHeaderClass =
  "text-[11px] font-bold uppercase tracking-wide text-gray-700";

function ActiveToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={`inline-flex h-10 w-full items-center justify-center rounded-xl border px-3 text-xs font-bold transition disabled:opacity-60 ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
      }`}
      aria-pressed={active}
    >
      {active ? "Aktif" : "Pasif"}
    </button>
  );
}

function MenuItemRow({
  menuId,
  item,
  pending,
  onSave,
  onDelete,
}: {
  menuId: string;
  item: MenuItem;
  pending: boolean;
  onSave: (id: string, formData: FormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [active, setActive] = useState(item.active);

  return (
    <form
      action={async (formData) => {
        await onSave(item.id, formData);
      }}
      className="rounded-xl border border-gray-100 bg-gray-50 p-3"
    >
      <input type="hidden" name="menuId" value={menuId} />
      <input type="hidden" name="active" value={active ? "true" : "false"} />
      <div className={menuGridClass}>
        <label className="block min-w-0">
          <span className={menuHeaderClass}>Başlık</span>
          <input
            name="label"
            defaultValue={item.label}
            required
            className={`${cmsInputClass} mt-1.5`}
          />
        </label>
        <label className="block min-w-0">
          <span className={menuHeaderClass}>Link</span>
          <input
            name="href"
            defaultValue={item.href}
            required
            className={`${cmsInputClass} mt-1.5`}
          />
        </label>
        <label className="block min-w-0">
          <span className={menuHeaderClass}>Sıra</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={item.sortOrder}
            className={`${cmsInputClass} mt-1.5`}
          />
        </label>
        <div>
          <span className={menuHeaderClass}>Durum</span>
          <div className="mt-1.5">
            <ActiveToggle
              active={active}
              onChange={setActive}
              disabled={pending}
            />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={pending}
            className="h-10 flex-1 rounded-xl bg-teal-600 px-3 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {pending ? "..." : "Kaydet"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onDelete(item.id)}
            className="h-10 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Sil
          </button>
        </div>
      </div>
    </form>
  );
}

export default function MenuManagement({ menus }: { menus: Menu[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newActive, setNewActive] = useState(true);

  async function handleSave(id: string | null, formData: FormData) {
    setPendingId(id ?? "new");
    setNotice(null);
    setError(null);
    try {
      const result = await saveSiteMenuItemAction(id, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotice(id ? "Menü öğesi kaydedildi." : "Menü öğesi eklendi.");
      if (!id) setNewActive(true);
      router.refresh();
    } catch {
      setError("Menü öğesi kaydedilemedi.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Silinsin mi?")) return;
    setPendingId(id);
    setNotice(null);
    setError(null);
    try {
      const result = await deleteSiteMenuItemAction(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotice("Menü öğesi silindi.");
      router.refresh();
    } catch {
      setError("Menü öğesi silinemedi.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {menus.map((menu) => (
        <section
          key={menu.id}
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-800">{menu.label}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{menu.key}</p>
          </div>

          <div className={`${menuGridClass} px-1`}>
            <span className={menuHeaderClass}>Başlık</span>
            <span className={menuHeaderClass}>Link</span>
            <span className={menuHeaderClass}>Sıra</span>
            <span className={menuHeaderClass}>Durum</span>
            <span className={menuHeaderClass}>İşlem</span>
          </div>

          <form
            action={async (formData) => {
              await handleSave(null, formData);
            }}
            className="rounded-xl border border-dashed border-teal-200 bg-teal-50/40 p-3"
          >
            <input type="hidden" name="menuId" value={menu.id} />
            <input
              type="hidden"
              name="active"
              value={newActive ? "true" : "false"}
            />
            <div className={menuGridClass}>
              <label className="block min-w-0">
                <input
                  name="label"
                  required
                  placeholder="Menü başlığı"
                  className={cmsInputClass}
                />
              </label>
              <label className="block min-w-0">
                <input
                  name="href"
                  placeholder="/link"
                  required
                  className={cmsInputClass}
                />
              </label>
              <label className="block min-w-0">
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={menu.items.length + 1}
                  className={cmsInputClass}
                />
              </label>
              <ActiveToggle
                active={newActive}
                onChange={setNewActive}
                disabled={pendingId !== null}
              />
              <button
                type="submit"
                disabled={pendingId !== null}
                className="h-10 rounded-xl bg-teal-600 px-3 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {pendingId === "new" ? "Ekleniyor..." : "Menü Öğesi Ekle"}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {menu.items
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <MenuItemRow
                  key={`${item.id}-${item.active}-${item.label}-${item.href}-${item.sortOrder}`}
                  menuId={menu.id}
                  item={item}
                  pending={pendingId === item.id}
                  onSave={async (id, formData) => handleSave(id, formData)}
                  onDelete={handleDelete}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
