import {
  normalizeVillaDescriptionHtml,
  sanitizeVillaDescriptionHtml,
  villaDescriptionLooksLikeHtml,
} from "@/lib/villa-html-content";

type VillaHtmlContentProps = {
  html: string;
  className?: string;
};

export default function VillaHtmlContent({
  html,
  className = "",
}: VillaHtmlContentProps) {
  const normalized = normalizeVillaDescriptionHtml(html);
  if (!normalized) return null;

  if (!villaDescriptionLooksLikeHtml(normalized)) {
    return (
      <div
        className={`whitespace-pre-line text-[15px] leading-relaxed text-slate-600 ${className}`}
      >
        {normalized}
      </div>
    );
  }

  const safeHtml = sanitizeVillaDescriptionHtml(normalized);

  return (
    <div
      className={`prose prose-slate mt-0 max-w-none text-[15px] leading-relaxed text-slate-600 prose-p:my-3 prose-headings:font-bold prose-headings:text-slate-900 prose-strong:text-slate-800 prose-ul:my-3 prose-li:my-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
