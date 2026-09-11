import { VILLA_NATURE_PEST_NOTICE } from "@/lib/villa-nature-pest-notice";

type Props = {
  className?: string;
  titleClassName?: string;
};

export default function VillaNaturePestNoticeBlock({
  className = "rounded-2xl border border-emerald-100 bg-emerald-50/40 px-5 py-6 sm:px-6",
  titleClassName = "text-lg font-bold text-slate-900",
}: Props) {
  return (
    <div className={className}>
      <h3 className={titleClassName}>{VILLA_NATURE_PEST_NOTICE.title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
        {VILLA_NATURE_PEST_NOTICE.intro}
      </p>
      <div className="mt-5 space-y-4">
        {VILLA_NATURE_PEST_NOTICE.items.map((item) => (
          <p
            key={item.label}
            className="text-[15px] leading-relaxed text-slate-700"
          >
            <span className="font-bold text-slate-900">{item.label}:</span>{" "}
            {item.text}
          </p>
        ))}
      </div>
    </div>
  );
}
