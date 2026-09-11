export type GuestReviewAdminStatus = "pending" | "approved" | "rejected";

export function parseGuestReviewAdminStatus(
  value: string | string[] | undefined | null
): GuestReviewAdminStatus {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "approved" || raw === "rejected" || raw === "pending") {
    return raw;
  }
  return "pending";
}

export function guestReviewsAdminHref(
  status: GuestReviewAdminStatus = "pending"
) {
  return `/admin/musteri-yonetimi/yorumlar?status=${status}`;
}

export function pendingGuestReviewsAdminHref() {
  return guestReviewsAdminHref("pending");
}
