"use client";

import { useTranslations } from "next-intl";

type Props = {
  className?: string;
  titleClassName?: string;
};

export default function VillaNaturePestNoticeBlock({
  className = "rounded-2xl border border-emerald-100 bg-emerald-50/40 px-5 py-6 sm:px-6",
  titleClassName = "text-lg font-bold text-slate-900",
}: Props) {
  const t = useTranslations("villa");
  const items = [
    { label: t("naturePestLabel"), text: t("naturePestText") },
    { label: t("natureWildlifeLabel"), text: t("natureWildlifeText") },
    { label: t("natureTipLabel"), text: t("natureTipText") },
  ];

  return (
    <div className={className}>
      <h3 className={titleClassName}>{t("natureTitle")}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
        {t("natureIntro")}
      </p>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
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
