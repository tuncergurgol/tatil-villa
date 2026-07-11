"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGuestReviewAction,
  saveGuestReviewAction,
} from "@/app/actions/admin/cms-content";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm outline-none focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

type ReviewRow = {
  id: string;
  guestName: string;
  guestCity: string;
  rating: number;
  title: string;
  comment: string;
  stayMonth: string;
  approved: boolean;
  featured: boolean;
  sortOrder: number;
};

export default function ReviewManagement({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        action={(fd) =>
          startTransition(async () => {
            await saveGuestReviewAction(null, fd);
            router.refresh();
          })
        }
        className="space-y-3 rounded-2xl border bg-white p-5"
      >
        <h2 className="font-semibold">Yeni Yorum</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input name="guestName" placeholder="Misafir adı" required className={inputClass} />
          <input name="guestCity" placeholder="Şehir" className={inputClass} />
          <input name="rating" type="number" min={1} max={5} defaultValue={5} className={inputClass} />
        </div>
        <input name="title" placeholder="Başlık" className={inputClass} />
        <textarea name="comment" placeholder="Yorum" required rows={3} className={inputClass} />
        <input name="stayMonth" placeholder="Konaklama ayı (örn. Temmuz 2025)" className={inputClass} />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="approved" defaultChecked />
            Onaylı
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="featured" />
            Öne çıkan
          </label>
        </div>
        <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
          Ekle
        </button>
      </form>

      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border bg-white p-5">
          <form
            action={(fd) =>
              startTransition(async () => {
                await saveGuestReviewAction(review.id, fd);
                router.refresh();
              })
            }
            className="space-y-3"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <input name="guestName" defaultValue={review.guestName} required className={inputClass} />
              <input name="guestCity" defaultValue={review.guestCity} className={inputClass} />
              <input name="rating" type="number" min={1} max={5} defaultValue={review.rating} className={inputClass} />
            </div>
            <input name="title" defaultValue={review.title} className={inputClass} />
            <textarea name="comment" defaultValue={review.comment} required rows={3} className={inputClass} />
            <input name="stayMonth" defaultValue={review.stayMonth} className={inputClass} />
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="approved" defaultChecked={review.approved} />
                Onaylı
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="featured" defaultChecked={review.featured} />
                Öne çıkan
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="text-sm font-semibold text-teal-600">
                Güncelle
              </button>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    if (!confirm("Silinsin mi?")) return;
                    await deleteGuestReviewAction(review.id);
                    router.refresh();
                  })
                }
                className="text-sm text-red-600"
              >
                Sil
              </button>
            </div>
          </form>
        </div>
      ))}
    </div>
  );
}
