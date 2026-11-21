"use client";

import type { ReactNode } from "react";

export const cmsInputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

export const cmsLabelClass = "text-xs font-medium text-gray-500";

export function CmsFormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function CmsField({
  label,
  children,
  className = "",
  hint,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={cmsLabelClass}>{label}</span>
      {hint ? (
        <span className="mt-0.5 block text-[11px] text-gray-400">{hint}</span>
      ) : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
