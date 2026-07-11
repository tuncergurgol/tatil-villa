import {
  createCampaign,
  deleteCampaign,
  updateCampaign,
} from "@/app/actions/admin/campaigns";

type Campaign = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  href: string;
  sortOrder: number;
  active: boolean;
};

export default function CampaignManagement({
  campaigns,
}: {
  campaigns: Campaign[];
}) {
  return (
    <div>
      <form action={createCampaign} className="space-y-3 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Yeni Kampanya</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="title"
            placeholder="Başlık"
            required
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            name="subtitle"
            placeholder="Alt başlık"
            required
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            name="image"
            placeholder="Görsel URL"
            required
            className="col-span-2 rounded-lg border px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="cta"
            placeholder="Buton metni"
            required
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            name="href"
            placeholder="Link"
            required
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked />
          Aktif
        </label>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Ekle
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="rounded-xl border bg-white p-5">
            <form
              action={updateCampaign.bind(null, campaign.id)}
              className="space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="title"
                  defaultValue={campaign.title}
                  required
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  name="subtitle"
                  defaultValue={campaign.subtitle}
                  required
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  name="image"
                  defaultValue={campaign.image}
                  required
                  className="col-span-2 rounded-lg border px-3 py-2 text-sm sm:col-span-2"
                />
                <input
                  name="cta"
                  defaultValue={campaign.cta}
                  required
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  name="href"
                  defaultValue={campaign.href}
                  required
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={campaign.sortOrder}
                  className="rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={campaign.active}
                />
                Aktif
              </label>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="text-sm font-semibold text-teal-600 hover:underline"
                >
                  Güncelle
                </button>
              </div>
            </form>
            <form action={deleteCampaign.bind(null, campaign.id)} className="mt-2">
              <button type="submit" className="text-sm text-red-600 hover:underline">
                Sil
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
