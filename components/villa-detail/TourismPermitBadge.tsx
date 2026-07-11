import { BadgeCheck } from "lucide-react";

type TourismPermitBadgeProps = {
  documentNo: string;
};

export default function TourismPermitBadge({
  documentNo,
}: TourismPermitBadgeProps) {
  if (!documentNo.trim()) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-slate-100/90 px-3 py-2 sm:gap-3 sm:px-3.5 sm:py-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/kultur-turizm-bakanligi.png"
        alt="T.C. Kültür ve Turizm Bakanlığı"
        width={180}
        height={67}
        className="h-10 w-auto max-w-[11.5rem] shrink-0 object-contain object-left sm:h-11"
      />

      <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 shadow-sm">
        <BadgeCheck
          className="h-7 w-7 shrink-0 text-sky-600"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="leading-tight">
          <p className="text-[11px] text-slate-500">Belge No:</p>
          <p className="text-sm font-bold text-slate-900 sm:text-[15px]">
            {documentNo}
          </p>
        </div>
      </div>
    </div>
  );
}
