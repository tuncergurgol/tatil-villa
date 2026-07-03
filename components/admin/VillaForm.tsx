import { VillaCategory } from "@prisma/client";
import type { Villa } from "@prisma/client";
import { createVilla, updateVilla } from "@/app/actions/admin/villas";
import VillaFeaturesPicker from "@/components/admin/amenities/VillaFeaturesPicker";
import type { AmenityCategoryItem } from "@/lib/queries/amenities";
import type { FacilityCategoryOption } from "@/lib/queries/facility-categories";

interface RegionOption {
  id: string;
  label: string;
}

interface VillaFormProps {
  regions: RegionOption[];
  amenityCategories: AmenityCategoryItem[];
  facilityCategories: FacilityCategoryOption[];
  villa?: Villa;
}

export default function VillaForm({
  regions,
  amenityCategories,
  facilityCategories,
  villa,
}: VillaFormProps) {
  const action = villa
    ? updateVilla.bind(null, villa.id)
    : createVilla;

  return (
    <form action={action} className="max-w-2xl space-y-4 rounded-xl border bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Villa Adı</span>
          <input
            name="name"
            required
            defaultValue={villa?.name}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Slug</span>
          <input
            name="slug"
            required
            defaultValue={villa?.slug}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Bölge (Mahalle)</span>
          <select
            name="regionId"
            required
            defaultValue={villa?.regionId}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Kategori</span>
          <select
            name="category"
            defaultValue={villa?.category ?? VillaCategory.villa}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="villa">Villa</option>
            <option value="bungalov">Bungalov</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Konum</span>
        <input
          name="location"
          required
          defaultValue={villa?.location}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium">Kişi</span>
          <input
            name="guests"
            type="number"
            required
            defaultValue={villa?.guests ?? 2}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Oda</span>
          <input
            name="bedrooms"
            type="number"
            required
            defaultValue={villa?.bedrooms ?? 1}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Banyo</span>
          <input
            name="bathrooms"
            type="number"
            required
            defaultValue={villa?.bathrooms ?? 1}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Gecelik Fiyat (TL)</span>
          <input
            name="pricePerNight"
            type="number"
            defaultValue={villa?.pricePerNight ?? ""}
            placeholder="Boş = teklif"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Kapak Görseli URL</span>
        <input
          name="image"
          required
          defaultValue={villa?.image}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Galeri URL&apos;leri (her satırda bir)</span>
        <textarea
          name="images"
          rows={3}
          defaultValue={villa?.images.join("\n")}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Açıklama</span>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={villa?.description}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </label>

      <div className="block">
        <span className="text-sm font-medium">Olanaklar ve Tesis Kategorileri</span>
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
          <VillaFeaturesPicker
            amenityCategories={amenityCategories}
            facilityCategories={facilityCategories}
            selectedAmenityNames={villa?.amenities}
            selectedFacilityCategoryNames={villa?.facilityCategories}
            isNewVilla={!villa}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={villa?.featured} />
          Öne Çıkan
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="popular" defaultChecked={villa?.popular} />
          Popüler
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="deal" defaultChecked={villa?.deal} />
          Fırsat
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recommended" defaultChecked={villa?.recommended} />
          Önerilen
        </label>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-700"
      >
        {villa ? "Güncelle" : "Kaydet"}
      </button>
    </form>
  );
}
