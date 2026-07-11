"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSiteMenuItemAction,
  saveSiteMenuItemAction,
} from "@/app/actions/admin/cms-content";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm outline-none focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

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

export default function MenuManagement({ menus }: { menus: Menu[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      router.refresh();
    } catch {
      setError("Menü öğesi kaydedilemedi.");
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
        <section key={menu.id} className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold text-gray-900">
            {menu.label}{" "}
            <span className="text-sm text-gray-400">({menu.key})</span>
          </h2>

          <form
            action={async (formData) => {
              await handleSave(null, formData);
            }}
            className="mt-4 grid gap-3 md:grid-cols-4"
          >
            <input type="hidden" name="menuId" value={menu.id} />
            <input
              name="label"
              placeholder="Başlık"
              required
              className={inputClass}
            />
            <input
              name="href"
              placeholder="/link"
              required
              className={inputClass}
            />
            <input
              name="sortOrder"
              type="number"
              defaultValue={menu.items.length + 1}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={pendingId !== null}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pendingId === "new" ? "Ekleniyor..." : "Menü Öğesi Ekle"}
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {menu.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <form
                  action={async (formData) => {
                    await handleSave(item.id, formData);
                  }}
                  className="grid gap-3 md:grid-cols-4"
                >
                  <input type="hidden" name="menuId" value={menu.id} />
                  <input
                    name="label"
                    defaultValue={item.label}
                    required
                    className={inputClass}
                  />
                  <input
                    name="href"
                    defaultValue={item.href}
                    required
                    className={inputClass}
                  />
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={item.sortOrder}
                    className={inputClass}
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        name="active"
                        value="on"
                        defaultChecked={item.active}
                      />
                      Aktif
                    </label>
                    <button
                      type="submit"
                      disabled={pendingId !== null}
                      className="text-xs font-semibold text-teal-600 disabled:opacity-60"
                    >
                      {pendingId === item.id ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                    <button
                      type="button"
                      disabled={pendingId !== null}
                      onClick={async () => {
                        if (!confirm("Silinsin mi?")) return;
                        setPendingId(item.id);
                        setNotice(null);
                        setError(null);
                        try {
                          const result = await deleteSiteMenuItemAction(item.id);
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
                      }}
                      className="text-xs text-red-600 disabled:opacity-60"
                    >
                      Sil
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
