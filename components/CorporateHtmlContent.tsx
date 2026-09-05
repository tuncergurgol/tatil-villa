"use client";

import { useRef } from "react";

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

type CorporateHtmlContentProps = {
  html: string;
};

export default function CorporateHtmlContent({ html }: CorporateHtmlContentProps) {
  const busyRef = useRef<HTMLButtonElement | null>(null);

  async function handleClick(event: React.MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement | null;
    const button = target?.closest("button.cms-copy-btn") as HTMLButtonElement | null;
    if (!button) return;

    event.preventDefault();
    const value = button.getAttribute("data-copy");
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      if (busyRef.current && busyRef.current !== button) {
        busyRef.current.innerHTML = COPY_ICON;
        busyRef.current.title = "Kopyala";
        busyRef.current.classList.remove("text-emerald-600");
      }
      busyRef.current = button;
      button.innerHTML = CHECK_ICON;
      button.title = "Kopyalandı";
      button.classList.add("text-emerald-600");
      window.setTimeout(() => {
        if (busyRef.current !== button) return;
        button.innerHTML = COPY_ICON;
        button.title = "Kopyala";
        button.classList.remove("text-emerald-600");
        busyRef.current = null;
      }, 1600);
    } catch {
      button.title = "Kopyalanamadı";
    }
  }

  return (
    <article
      className="prose prose-teal mt-8 max-w-none prose-headings:scroll-mt-28"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  );
}
