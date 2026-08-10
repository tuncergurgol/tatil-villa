import type { Metadata } from "next";
import GuestReviewForm from "@/components/guest-review/GuestReviewForm";
import { getGuestReviewInvitePageData } from "@/app/actions/guest-review";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Konaklama Değerlendirmesi",
  robots: { index: false, follow: false },
};

export default async function GuestReviewInvitePage({ params }: PageProps) {
  const { token } = await params;
  const data = await getGuestReviewInvitePageData(token);

  if (!data) {
    return (
      <div className="min-h-[60vh] bg-slate-50 py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
            <h1 className="text-xl font-bold text-slate-900">
              Geçersiz bağlantı
            </h1>
            <p className="mt-3 text-sm text-red-600">
              Bu yorum bağlantısı bulunamadı veya artık geçerli değil.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if ("used" in data && data.used) {
    return (
      <div className="min-h-[60vh] bg-slate-50 py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
            <h1 className="text-xl font-bold text-slate-900">
              Yorum zaten gönderildi
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Bu bağlantı ile daha önce değerlendirme yapılmış. Teşekkür ederiz.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if ("expired" in data && data.expired) {
    return (
      <div className="min-h-[60vh] bg-slate-50 py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
            <h1 className="text-xl font-bold text-slate-900">
              Bağlantının süresi dolmuş
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Yorum süresi sona ermiş. Yardım için bizimle iletişime geçebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-slate-50 py-12">
      <div className="mx-auto max-w-lg px-4">
        <GuestReviewForm
          token={token}
          guestName={data.guestName}
          villaName={data.villaName}
          googleReviewUrl={data.googleReviewUrl}
        />
      </div>
    </div>
  );
}
