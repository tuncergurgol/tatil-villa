"use client";

import {
  createCampaign,
  deleteCampaign,
  updateCampaign,
} from "@/app/actions/admin/campaigns";
import {
  CmsField,
  CmsFormSection,
  cmsInputClass,
} from "@/components/admin/content/CmsFormSections";

type Campaign = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  href: string;
  displayType: "SLIDER" | "BOX";
  sortOrder: number;
  active: boolean;
};

export default function CampaignManagement({
  campaigns,
}: {
  campaigns: Campaign[];
}) {
  return (
    <div className="space-y-6">
      <form
        action={createCampaign}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-gray-800">Yeni Kampanya</h2>

        <CmsFormSection title="Temel Bilgiler">
          <div className="grid gap-4 sm:grid-cols-2">
            <CmsField label="Başlık">
              <input name="title" required className={cmsInputClass} />
            </CmsField>
            <CmsField label="Alt Başlık">
              <input name="subtitle" required className={cmsInputClass} />
            </CmsField>
          </div>
          <CmsField label="Görsel URL">
            <input name="image" required className={cmsInputClass} />
          </CmsField>
          <div className="grid gap-4 sm:grid-cols-2">
            <CmsField label="Buton Metni">
              <input name="cta" required className={cmsInputClass} />
            </CmsField>
            <CmsField label="Link">
              <input name="href" required className={cmsInputClass} />
            </CmsField>
            <CmsField label="Görünüm Tipi">
              <select name="displayType" defaultValue="SLIDER" className={cmsInputClass}>
                <option value="SLIDER">Slider</option>
                <option value="BOX">Kutu</option>
              </select>
            </CmsField>
            <CmsField label="Sıra">
              <input
                name="sortOrder"
                type="number"
                defaultValue={0}
                className={cmsInputClass}
              />
            </CmsField>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="active"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 text-teal-600"
            />
            Aktif
          </label>
        </CmsFormSection>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Ekle
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5"
          >
            <form
              action={updateCampaign.bind(null, campaign.id)}
              className="space-y-5"
            >
              <CmsFormSection title="Temel Bilgiler">
                <div className="grid gap-4 sm:grid-cols-2">
                  <CmsField label="Başlık">
                    <input
                      name="title"
                      defaultValue={campaign.title}
                      required
                      className={cmsInputClass}
                    />
                  </CmsField>
                  <CmsField label="Alt Başlık">
                    <input
                      name="subtitle"
                      defaultValue={campaign.subtitle}
                      required
                      className={cmsInputClass}
                    />
                  </CmsField>
                </div>
                <CmsField label="Görsel URL">
                  <input
                    name="image"
                    defaultValue={campaign.image}
                    required
                    className={cmsInputClass}
                  />
                </CmsField>
                <div className="grid gap-4 sm:grid-cols-3">
                  <CmsField label="Buton Metni">
                    <input
                      name="cta"
                      defaultValue={campaign.cta}
                      required
                      className={cmsInputClass}
                    />
                  </CmsField>
                  <CmsField label="Link">
                    <input
                      name="href"
                      defaultValue={campaign.href}
                      required
                      className={cmsInputClass}
                    />
                  </CmsField>
                  <CmsField label="Sıra">
                    <input
                      name="sortOrder"
                      type="number"
                      defaultValue={campaign.sortOrder}
                      className={cmsInputClass}
                    />
                  </CmsField>
                  <CmsField label="Görünüm Tipi">
                    <select
                      name="displayType"
                      defaultValue={campaign.displayType}
                      className={cmsInputClass}
                    >
                      <option value="SLIDER">Slider</option>
                      <option value="BOX">Kutu</option>
                    </select>
                  </CmsField>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={campaign.active}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                  />
                  Aktif
                </label>
              </CmsFormSection>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="text-sm font-semibold text-teal-600"
                >
                  Güncelle
                </button>
              </div>
            </form>
            <form action={deleteCampaign.bind(null, campaign.id)}>
              <button type="submit" className="text-sm text-red-600">
                Sil
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
