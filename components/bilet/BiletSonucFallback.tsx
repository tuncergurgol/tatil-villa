import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { BILET_PUBLIC_ROUTES } from "@/lib/biletall";

type BiletSonucFallbackProps = {
  homeUrl: string;
};

export default function BiletSonucFallback({ homeUrl }: BiletSonucFallbackProps) {
  return (
    <div className="w-full max-w-xl rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm ring-1 ring-amber-100/80 sm:p-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <AlertCircle className="size-7" strokeWidth={2.2} aria-hidden />
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-900">
        Bilet oturumu bulunamadı
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Bu sayfa satın alma işlemi tamamlandıktan sonra açılır. PNR sorgulamak
        için bilet arama ekranındaki{" "}
        <strong className="font-semibold text-slate-800">PNR Arama</strong>{" "}
        sekmesini kullanın.
      </p>

      <p className="mt-5 text-xs text-slate-500">
        Yeni bilet aramak için{" "}
        <Link
          href={BILET_PUBLIC_ROUTES.ara}
          className="font-semibold text-sky-700 underline decoration-sky-200 underline-offset-2 hover:text-sky-900"
        >
          bilet arama sayfasına
        </Link>{" "}
        gidin veya{" "}
        <Link
          href={homeUrl}
          className="font-semibold text-sky-700 underline decoration-sky-200 underline-offset-2 hover:text-sky-900"
        >
          ana sayfaya dönün
        </Link>
        .
      </p>
    </div>
  );
}
