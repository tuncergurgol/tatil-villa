"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGuestReviewAction,
  saveGuestReviewAction,
} from "@/app/actions/admin/cms-content";
import {
  CmsField,
  CmsFormSection,
  cmsInputClass,
} from "@/components/admin/content/CmsFormSections";

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
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-gray-800">Yeni Yorum</h2>

        <CmsFormSection title="Temel Bilgiler">
          <div className="grid gap-4 md:grid-cols-3">
            <CmsField label="Misafir Adı">
              <input
                name="guestName"
                placeholder="Misafir adı"
                required
                className={cmsInputClass}
              />
            </CmsField>
            <CmsField label="Şehir">
              <input
                name="guestCity"
                placeholder="Şehir"
                className={cmsInputClass}
              />
            </CmsField>
            <CmsField label="Puan">
              <input
                name="rating"
                type="number"
                min={1}
                max={5}
                defaultValue={5}
                className={cmsInputClass}
              />
            </CmsField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CmsField label="Başlık">
              <input name="title" placeholder="Başlık" className={cmsInputClass} />
            </CmsField>
            <CmsField label="Konaklama Ayı">
              <input
                name="stayMonth"
                placeholder="örn. Temmuz 2025"
                className={cmsInputClass}
              />
            </CmsField>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="approved"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-teal-600"
              />
              Onaylı
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="featured"
                className="h-4 w-4 rounded border-gray-300 text-teal-600"
              />
              Öne çıkan
            </label>
          </div>
        </CmsFormSection>

        <CmsFormSection title="İçerik">
          <CmsField label="Yorum">
            <textarea
              name="comment"
              placeholder="Yorum"
              required
              rows={3}
              className={cmsInputClass}
            />
          </CmsField>
        </CmsFormSection>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Ekle
          </button>
        </div>
      </form>

      {reviews.map((review) => (
        <div
          key={review.id}
          className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <form
            action={(fd) =>
              startTransition(async () => {
                await saveGuestReviewAction(review.id, fd);
                router.refresh();
              })
            }
            className="space-y-5"
          >
            <CmsFormSection title="Temel Bilgiler">
              <div className="grid gap-4 md:grid-cols-3">
                <CmsField label="Misafir Adı">
                  <input
                    name="guestName"
                    defaultValue={review.guestName}
                    required
                    className={cmsInputClass}
                  />
                </CmsField>
                <CmsField label="Şehir">
                  <input
                    name="guestCity"
                    defaultValue={review.guestCity}
                    className={cmsInputClass}
                  />
                </CmsField>
                <CmsField label="Puan">
                  <input
                    name="rating"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={review.rating}
                    className={cmsInputClass}
                  />
                </CmsField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <CmsField label="Başlık">
                  <input
                    name="title"
                    defaultValue={review.title}
                    className={cmsInputClass}
                  />
                </CmsField>
                <CmsField label="Konaklama Ayı">
                  <input
                    name="stayMonth"
                    defaultValue={review.stayMonth}
                    className={cmsInputClass}
                  />
                </CmsField>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="approved"
                    defaultChecked={review.approved}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                  />
                  Onaylı
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="featured"
                    defaultChecked={review.featured}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                  />
                  Öne çıkan
                </label>
              </div>
            </CmsFormSection>

            <CmsFormSection title="İçerik">
              <CmsField label="Yorum">
                <textarea
                  name="comment"
                  defaultValue={review.comment}
                  required
                  rows={3}
                  className={cmsInputClass}
                />
              </CmsField>
            </CmsFormSection>

            <div className="flex gap-3">
              <button
                type="submit"
                className="text-sm font-semibold text-teal-600"
              >
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
