"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  localeLabels,
  locales,
  type AppLocale,
} from "@/i18n/routing";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const t = useTranslations("header");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 sm:px-3"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("selectLanguage")}
      >
        <Languages className="h-3.5 w-3.5 text-slate-600" aria-hidden />
        <span>{localeLabels[locale].code}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={t("selectLanguage")}
          className="absolute right-0 z-[60] mt-2 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {locales.map((item) => {
            const active = item === locale;
            return (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  if (item !== locale) {
                    router.replace(pathname, { locale: item });
                  }
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                  active ? "bg-slate-50 font-semibold text-slate-900" : "text-slate-700"
                }`}
              >
                <span>
                  <span className="mr-2 font-semibold text-slate-500">
                    {localeLabels[item].code}
                  </span>
                  {localeLabels[item].nativeName}
                </span>
                {active ? (
                  <Check className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
