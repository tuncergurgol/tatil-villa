import { BadgeCheck } from "lucide-react";
import type { TourismDocumentType } from "@prisma/client";
import { isKonutBelgesiDocumentType } from "@/lib/villa-document-types";
import { buildKonutBelgeCheckUrl } from "@/lib/konut-belge-check";

type TourismPermitBadgeProps = {
  documentNo: string;
  documentType?: TourismDocumentType | null;
};

export default function TourismPermitBadge({
  documentNo,
  documentType = null,
}: TourismPermitBadgeProps) {
  const trimmed = documentNo.trim();
  if (!trimmed) return null;

  const isLinkable = isKonutBelgesiDocumentType(documentType);
  const className =
    "group flex min-w-0 flex-wrap items-center gap-2.5 rounded-xl bg-slate-100/90 px-3 py-2.5 sm:gap-3.5 sm:px-4 sm:py-3 " +
    (isLinkable
      ? "cursor-pointer transition hover:bg-slate-200/80 hover:ring-2 hover:ring-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      : "");

  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/kultur-turizm-bakanligi.png"
        alt="T.C. Kültür ve Turizm Bakanlığı"
        width={252}
        height={94}
        className="h-14 w-auto max-w-[16rem] shrink-0 object-contain object-left sm:h-[3.85rem]"
      />

      <div
        className={`flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 shadow-sm ${
          isLinkable ? "transition group-hover:border-sky-200" : ""
        }`}
      >
        <BadgeCheck
          className="h-7 w-7 shrink-0 text-sky-600"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="leading-tight">
          <p className="text-[11px] text-slate-500">Belge No:</p>
          <p className="text-sm font-bold text-slate-900 sm:text-[15px]">
            {trimmed}
          </p>
        </div>
      </div>
    </>
  );

  if (!isLinkable) {
    return <div className={className}>{content}</div>;
  }

  return (
    <a
      href={buildKonutBelgeCheckUrl(trimmed)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Turizm belgesi doğrula: ${trimmed}`}
      className={className}
    >
      {content}
    </a>
  );
}
