"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Star, Trash2, X } from "lucide-react";
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

type StatusFilter = "pending" | "approved" | "rejected";

function reviewIsPending(review: ReviewRow) {
  return !review.approved && !review.rejectedReason?.trim();
}

function reviewIsRejected(review: ReviewRow) {
  return !review.approved && Boolean(review.rejectedReason?.trim());
}

function reviewIsApproved(review: ReviewRow) {
  return review.approved;
}

function VillaNameMultiSelect({
  options,
  selectedIds,
  onChange,
}: {
  options: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    const sorted = [...options].sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
    );
    if (!query) return sorted;
    return sorted.filter((option) =>
      option.name.toLocaleLowerCase("tr-TR").includes(query)
    );
  }, [options, search]);

  function toggle(id: string, checked: boolean) {
    if (checked) onChange([...selectedIds, id]);
    else onChange(selectedIds.filter((item) => item !== id));
  }

  return (
    <details
      className="group relative min-w-[220px] max-w-md flex-1"
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition hover:border-teal-300">
        <span
          className={
            selectedIds.length > 0
              ? "truncate font-semibold text-teal-700"
              : "text-gray-500"
          }
        >
          {selectedIds.length > 0
            ? `${selectedIds.length} villa seçili`
            : "Villa adı seçin..."}
        </span>
        <span className="text-xs text-gray-400 group-open:rotate-180">▼</span>
      </summary>
      <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 p-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Villa ara..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs outline-none focus:border-teal-400"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.length > 0 ? (
            filtered.map((option) => {
              const checked = selectedIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-teal-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      toggle(option.id, event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                  />
                  <span className="truncate text-gray-800">{option.name}</span>
                </label>
              );
            })
          ) : (
            <p className="px-2 py-3 text-sm text-gray-500">Villa bulunamadı.</p>
          )}
        </div>
        {selectedIds.length > 0 ? (
          <div className="border-t border-gray-100 px-2 py-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              Seçimi temizle
            </button>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function ReviewEditModal({
  review,
  onClose,
  onSaved,
}: {
  review: ReviewRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            Yorumu Düzenle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          action={(fd) =>
            startTransition(async () => {
              await saveGuestReviewAction(review.id, fd);
              onSaved();
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
              <CmsField label="Konaklama Zamanı">
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
                rows={4}
                className={cmsInputClass}
              />
            </CmsField>
          </CmsFormSection>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {!review.approved && !reviewIsRejected(review) ? (
                <>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await approveGuestReviewAction(review.id);
                        onSaved();
                      })
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      const reason = window.prompt(
                        "Red nedeni (isteğe bağlı):"
                      );
                      if (reason === null) return;
                      startTransition(async () => {
                        await rejectGuestReviewAction(review.id, reason);
                        onSaved();
                      });
                    }}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Reddet
                  </button>
                </>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReviewCreateModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            Yeni Yorum (Manuel)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          action={(fd) =>
            startTransition(async () => {
              await saveGuestReviewAction(null, fd);
              onSaved();
            })
          }
          className="space-y-5"
        >
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
                <input
                  name="title"
                  placeholder="Başlık"
                  className={cmsInputClass}
                />
              </CmsField>
              <CmsField label="Konaklama Zamanı">
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
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReviewManagement({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [selectedVillaIds, setSelectedVillaIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<ReviewRow | null>(null);
  const [creating, setCreating] = useState(false);

  const villaOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const review of reviews) {
      if (review.villa?.id) {
        map.set(review.villa.id, review.villa.name);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [reviews]);

  const counts = useMemo(() => {
    return {
      pending: reviews.filter(reviewIsPending).length,
      approved: reviews.filter(reviewIsApproved).length,
      rejected: reviews.filter(reviewIsRejected).length,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (statusFilter === "pending" && !reviewIsPending(review)) return false;
      if (statusFilter === "approved" && !reviewIsApproved(review)) return false;
      if (statusFilter === "rejected" && !reviewIsRejected(review)) return false;
      if (
        selectedVillaIds.length > 0 &&
        (!review.villa?.id || !selectedVillaIds.includes(review.villa.id))
      ) {
        return false;
      }
      return true;
    });
  }, [reviews, statusFilter, selectedVillaIds]);

  const statusButtons: {
    key: StatusFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "pending",
      label: "Onay Bekleyen Yorumlar",
      count: counts.pending,
    },
    { key: "approved", label: "Onaylı Yorumlar", count: counts.approved },
    { key: "rejected", label: "Ret Edilen Yorumlar", count: counts.rejected },
  ];

  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Misafir Yorumları</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Misafir daveti ve manuel yorumları onaylayın, düzenleyin
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Yeni Yorum
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
      <div className="flex flex-wrap gap-2">
        {statusButtons.map((button) => {
          const active = statusFilter === button.key;
          return (
            <button
              key={button.key}
              type="button"
              onClick={() => setStatusFilter(button.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-teal-600 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-700 hover:border-teal-300 hover:bg-teal-50"
              }`}
            >
              {button.label}
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                  active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {button.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Villa Adı</span>
        <VillaNameMultiSelect
          options={villaOptions}
          selectedIds={selectedVillaIds}
          onChange={setSelectedVillaIds}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Villa Adı</th>
                <th className="px-4 py-3">Müşteri Adı</th>
                <th className="px-4 py-3">Konaklama Zamanı</th>
                <th className="px-4 py-3">Puan</th>
                <th className="px-4 py-3">Onaylı</th>
                <th className="px-4 py-3">Öne Çıkan</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    Bu filtrede yorum yok.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {review.villa?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{review.guestName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {review.stayMonth || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {review.rating}/5
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {review.approved ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <Check className="h-4 w-4" />
                          Evet
                        </span>
                      ) : (
                        <span className="text-gray-400">Hayır</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {review.featured ? (
                        <span className="font-medium text-teal-700">Evet</span>
                      ) : (
                        <span className="text-gray-400">Hayır</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(review)}
                          className="rounded-lg p-2 text-teal-700 hover:bg-teal-50"
                          title="Değiştir"
                          aria-label="Değiştir"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              if (!confirm("Bu yorum silinsin mi?")) return;
                              await deleteGuestReviewAction(review.id);
                              refresh();
                            })
                          }
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Sil"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {creating ? (
        <ReviewCreateModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            refresh();
          }}
        />
      ) : null}

      {editing ? (
        <ReviewEditModal
          review={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
