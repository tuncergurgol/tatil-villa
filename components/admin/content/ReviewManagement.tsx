"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveGuestReviewAction,
  rejectGuestReviewAction,
} from "@/app/actions/admin/guest-review";
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
  source: string;
  rejectedReason: string;
  submittedAt: Date | string | null;
  villa: { id: string; name: string; villaId: number | null } | null;
};

function sourceLabel(source: string) {
  if (source === "guest_invite") return "Misafir daveti";
  return "Manuel";
}

export default function ReviewManagement({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pendingReviews = useMemo(
    () =>
      reviews.filter(
        (review) =>
          !review.approved &&
          review.source === "guest_invite" &&
          !review.rejectedReason?.trim()
      ),
    [reviews]
  );
  const publishedReviews = useMemo(
    () => reviews.filter((review) => !pendingReviews.some((p) => p.id === review.id)),
    [reviews, pendingReviews]
  );

  function handleApprove(id: string) {
    startTransition(async () => {
      await approveGuestReviewAction(id);
      router.refresh();
    });
  }

  function handleReject(id: string) {
    const reason = window.prompt(
      "Red nedeni (isteğe bağlı — müşteriyle iletişim için not):"
    );
    if (reason === null) return;
    startTransition(async () => {
      await rejectGuestReviewAction(id, reason);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {pendingReviews.length > 0 ? (
        <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <div>
            <h2 className="text-sm font-semibold text-amber-900">
              Onay Bekleyen Yorumlar ({pendingReviews.length})
            </h2>
            <p className="mt-1 text-xs text-amber-800">
              Misafir daveti ile gelen yorumlar yayına alınmadan önce incelenir.
            </p>
          </div>

          {pendingReviews.map((review) => (
            <article
              key={review.id}
              className="space-y-3 rounded-xl border border-amber-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{review.guestName}</p>
                  <p className="text-xs text-gray-500">
                    {review.villa?.name ?? "Villa belirtilmemiş"} ·{" "}
                    {review.rating}/5 · {sourceLabel(review.source)}
                  </p>
                  {review.submittedAt ? (
                    <p className="text-xs text-gray-400">
                      {new Date(review.submittedAt).toLocaleString("tr-TR")}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleApprove(review.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleReject(review.id)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Reddet
                  </button>
                </div>
              </div>
              {review.title ? (
                <p className="text-sm font-medium text-gray-800">{review.title}</p>
              ) : null}
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.comment}</p>
              {review.rating <= 3 ? (
                <p className="text-xs font-medium text-amber-700">
                  Düşük puan — müşteriyle iletişim kurulması önerilir; Google
                  yönlendirmesi yapılmaz.
                </p>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <form
        action={(fd) =>
          startTransition(async () => {
            await saveGuestReviewAction(null, fd);
            router.refresh();
          })
        }
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-gray-800">Yeni Yorum (Manuel)</h2>

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

      {publishedReviews.map((review) => (
        <div
          key={review.id}
          className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>{sourceLabel(review.source)}</span>
            {review.villa ? <span>{review.villa.name}</span> : null}
            {!review.approved && review.rejectedReason ? (
              <span className="text-red-600">Red: {review.rejectedReason}</span>
            ) : null}
          </div>
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
