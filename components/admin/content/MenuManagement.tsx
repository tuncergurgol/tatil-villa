"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSiteMenuItemAction,
  saveSiteMenuItemAction,
} from "@/app/actions/admin/cms-content";
import { cmsInputClass } from "@/components/admin/content/CmsFormSections";

type MenuSiteOption = {
  key: string;
  label: string;
};

type MenuItem = {
  id: string;
  label: string;
  href: string;
  sortOrder: number;
  active: boolean;
  openInNewTab: boolean;
  siteKeys: string[];
};

type Menu = {
  id: string;
  key: string;
  label: string;
  items: MenuItem[];
};

const menuGridClass =
  "grid grid-cols-1 items-center gap-3 lg:grid-cols-[64px_minmax(0,1fr)_minmax(0,1.1fr)_minmax(180px,220px)_88px_112px] lg:gap-4";

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

function siteChecked(siteKeys: string[], siteKey: string) {
  return siteKeys.length === 0 || siteKeys.includes(siteKey);
}

function SiteChecks({
  siteOptions,
  siteKeys,
}: {
  siteOptions: MenuSiteOption[];
  siteKeys?: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {siteOptions.map((site) => (
        <label
          key={site.key}
          className="flex items-center gap-1.5 text-[11px] text-gray-700"
        >
          <input
            type="checkbox"
            name="siteKeys"
            value={site.key}
            defaultChecked={siteKeys ? siteChecked(siteKeys, site.key) : true}
          />
          {site.label}
        </label>
      ))}
    </div>
  );
}

function MenuItemRow({
  menuId,
  item,
  siteOptions,
  pending,
  onSave,
  onDelete,
}: {
  menuId: string;
  item: MenuItem;
  siteOptions: MenuSiteOption[];
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
          <input
            name="sortOrder"
            type="number"
            defaultValue={item.sortOrder}
            aria-label="Sıra"
            className={cmsInputClass}
          />
        </label>
        <label className="block min-w-0">
          <input
            name="label"
            defaultValue={item.label}
            required
            aria-label="Başlık"
            className={cmsInputClass}
          />
        </label>
        <label className="block min-w-0">
          <input
            name="href"
            defaultValue={item.href}
            required
            aria-label="Link"
            className={cmsInputClass}
          />
        </label>
        <SiteChecks siteOptions={siteOptions} siteKeys={item.siteKeys} />
        <ActiveToggle
          active={active}
          onChange={setActive}
          disabled={pending}
        />
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

export default function MenuManagement({
  menus,
  siteOptions,
}: {
  menus: Menu[];
  siteOptions: MenuSiteOption[];
}) {
  const router = useRouter();
  const [openMenuIds, setOpenMenuIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addMenuId, setAddMenuId] = useState<string | null>(null);
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
      if (!id) {
        setNewActive(true);
        setAddMenuId(null);
      }
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

  const addMenu = menus.find((menu) => menu.id === addMenuId) ?? null;

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

      {menus.map((menu) => {
        const open = openMenuIds.has(menu.id);
        return (
        <section
          key={menu.id}
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <button
            type="button"
            aria-expanded={open}
            onClick={() =>
              setOpenMenuIds((current) => {
                const next = new Set(current);
                if (next.has(menu.id)) next.delete(menu.id);
                else next.add(menu.id);
                return next;
              })
            }
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-gray-800">
                {menu.label}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {menu.key} · {menu.items.length} öğe
              </span>
            </span>
            <span className="text-xs font-semibold text-gray-500">
              {open ? "Kapat" : "Aç"}
            </span>
          </button>

          {open ? (
          <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setNewActive(true);
                setAddMenuId(menu.id);
              }}
              className="h-10 rounded-xl bg-teal-600 px-4 text-xs font-bold text-white hover:bg-teal-700"
            >
              Menü Öğesi Ekle
            </button>
          </div>
          <div className={`${menuGridClass} hidden px-1 lg:grid`}>
            <span className={menuHeaderClass}>Sıra</span>
            <span className={menuHeaderClass}>Başlık</span>
            <span className={menuHeaderClass}>Link</span>
            <span className={menuHeaderClass}>Siteler</span>
            <span className={menuHeaderClass}>Durum</span>
            <span className={menuHeaderClass}>İşlem</span>
          </div>

          <div className="space-y-2">
            {menu.items
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <MenuItemRow
                  key={`${item.id}-${item.active}-${item.label}-${item.href}-${item.sortOrder}-${item.siteKeys.join(",")}`}
                  menuId={menu.id}
                  item={item}
                  siteOptions={siteOptions}
                  pending={pendingId === item.id}
                  onSave={async (id, formData) => handleSave(id, formData)}
                  onDelete={handleDelete}
                />
              ))}
          </div>
          </>
          ) : null}
        </section>
        );
      })}
      {addMenu ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            key={addMenu.id}
            action={async (formData) => {
              await handleSave(null, formData);
            }}
            role="dialog"
            aria-labelledby="menu-item-add-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3
              id="menu-item-add-title"
              className="text-base font-semibold text-gray-900"
            >
              Menü Öğesi Ekle
            </h3>
            <p className="mt-1 text-xs text-gray-500">{addMenu.label}</p>
            <input type="hidden" name="menuId" value={addMenu.id} />
            <input
              type="hidden"
              name="active"
              value={newActive ? "true" : "false"}
            />
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className={menuHeaderClass}>Sıra</span>
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={addMenu.items.length + 1}
                  className={`${cmsInputClass} mt-1.5`}
                />
              </label>
              <label className="block">
                <span className={menuHeaderClass}>Başlık</span>
                <input
                  name="label"
                  required
                  className={`${cmsInputClass} mt-1.5`}
                />
              </label>
              <label className="block">
                <span className={menuHeaderClass}>Link</span>
                <input
                  name="href"
                  required
                  placeholder="/link"
                  className={`${cmsInputClass} mt-1.5`}
                />
              </label>
              <div>
                <span className={menuHeaderClass}>Siteler</span>
                <div className="mt-1.5">
                  <SiteChecks siteOptions={siteOptions} />
                </div>
              </div>
              <div>
                <span className={menuHeaderClass}>Durum</span>
                <div className="mt-1.5 max-w-[120px]">
                  <ActiveToggle
                    active={newActive}
                    onChange={setNewActive}
                    disabled={pendingId !== null}
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddMenuId(null)}
                className="h-10 rounded-xl border border-gray-200 px-4 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={pendingId !== null}
                className="h-10 rounded-xl bg-teal-600 px-4 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {pendingId === "new" ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
