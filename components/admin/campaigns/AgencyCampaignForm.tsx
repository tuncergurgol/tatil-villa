import Link from "next/link";
import type { Campaign } from "@prisma/client";
import {
  createCampaignAndOpen,
  deleteCampaignAndReturn,
  updateCampaign,
} from "@/app/actions/admin/campaigns";
import { CAMPAIGN_DISPLAY_TYPE_LABELS } from "@/lib/callback-request-labels";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

interface Props {
  campaign?: Campaign | null;
}

export default function AgencyCampaignForm({ campaign }: Props) {
  const isEdit = Boolean(campaign);
  const action = isEdit
    ? updateCampaign.bind(null, campaign!.id)
    : createCampaignAndOpen;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? "Kampanya Düzenle" : "Yeni Kampanya"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Slider ve kutu kampanya alanları
          </p>
        </div>
        <Link
          href="/admin/acente/kampanyalar"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Listeye dön
        </Link>
      </div>

      <form
        action={action}
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-gray-500">Başlık</span>
            <input
              name="title"
              required
              defaultValue={campaign?.title ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-gray-500">Alt Başlık</span>
            <textarea
              name="subtitle"
              required
              rows={3}
              defaultValue={campaign?.subtitle ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-gray-500">Görsel URL</span>
            <input
              name="image"
              required
              defaultValue={campaign?.image ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Buton Metni</span>
            <input
              name="cta"
              defaultValue={campaign?.cta ?? "İncele"}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Link</span>
            <input
              name="href"
              required
              defaultValue={campaign?.href ?? ""}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Görünüm Tipi</span>
            <select
              name="displayType"
              defaultValue={campaign?.displayType ?? "SLIDER"}
              className={inputClass}
            >
              {Object.entries(CAMPAIGN_DISPLAY_TYPE_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Sıra</span>
            <input
              name="sortOrder"
              type="number"
              defaultValue={campaign?.sortOrder ?? 0}
              className={inputClass}
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={campaign?.active ?? true}
              className="h-4 w-4 rounded border-gray-300 text-teal-600"
            />
            Aktif
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            {isEdit ? "Kaydet" : "Oluştur"}
          </button>
          {isEdit ? (
            <button
              type="submit"
              formAction={deleteCampaignAndReturn.bind(null, campaign!.id)}
              className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Sil
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
