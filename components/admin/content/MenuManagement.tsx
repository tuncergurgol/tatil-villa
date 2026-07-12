"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSiteMenuItemAction,
  saveSiteMenuItemAction,
} from "@/app/actions/admin/cms-content";
import {
  CmsField,
  CmsFormSection,
  cmsInputClass,
} from "@/components/admin/content/CmsFormSections";

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
        <section
          key={menu.id}
          className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-800">{menu.label}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{menu.key}</p>
          </div>

          <form
            action={async (formData) => {
              await handleSave(null, formData);
            }}
            className="space-y-5"
          >
            <input type="hidden" name="menuId" value={menu.id} />
            <CmsFormSection title="Temel Bilgiler">
              <div className="grid gap-4 md:grid-cols-3">
                <CmsField label="Başlık">
                  <input name="label" required className={cmsInputClass} />
                </CmsField>
                <CmsField label="Link">
                  <input
                    name="href"
                    placeholder="/link"
                    required
                    className={cmsInputClass}
                  />
                </CmsField>
                <CmsField label="Sıra">
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={menu.items.length + 1}
                    className={cmsInputClass}
                  />
                </CmsField>
              </div>
            </CmsFormSection>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pendingId !== null}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pendingId === "new" ? "Ekleniyor..." : "Menü Öğesi Ekle"}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {menu.items
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <form
                    action={async (formData) => {
                      await handleSave(item.id, formData);
                    }}
                    className="space-y-4"
                  >
                    <input type="hidden" name="menuId" value={menu.id} />
                    <CmsFormSection title="Temel Bilgiler">
                      <div className="grid gap-4 md:grid-cols-3">
                        <CmsField label="Başlık">
                          <input
                            name="label"
                            defaultValue={item.label}
                            required
                            className={cmsInputClass}
                          />
                        </CmsField>
                        <CmsField label="Link">
                          <input
                            name="href"
                            defaultValue={item.href}
                            required
                            className={cmsInputClass}
                          />
                        </CmsField>
                        <CmsField label="Sıra">
                          <input
                            name="sortOrder"
                            type="number"
                            defaultValue={item.sortOrder}
                            className={cmsInputClass}
                          />
                        </CmsField>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          name="active"
                          value="on"
                          defaultChecked={item.active}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600"
                        />
                        Aktif
                      </label>
                    </CmsFormSection>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={pendingId !== null}
                        className="text-sm font-semibold text-teal-600 disabled:opacity-60"
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
                            const result = await deleteSiteMenuItemAction(
                              item.id
                            );
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
                        className="text-sm text-red-600 disabled:opacity-60"
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
