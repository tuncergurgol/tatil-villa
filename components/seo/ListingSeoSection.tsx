import { Link } from "@/lib/i18n/navigation";
import type { ListingSeoPayload } from "@/lib/seo-listing-content";

export default function ListingSeoSection({
  content,
  className = "",
}: {
  content: ListingSeoPayload;
  className?: string;
}) {
  return (
    <section
      className={`mt-10 rounded-2xl border border-sky-100 bg-white px-5 py-6 sm:px-7 sm:py-8 ${className}`}
      aria-labelledby="listing-seo-heading"
    >
      <h2
        id="listing-seo-heading"
        className="text-lg font-semibold text-gray-900 sm:text-xl"
      >
        {content.heading}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-gray-700">
        {content.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>

      {content.relatedLinks.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {content.relatedLinks.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}

      {content.faqs.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-base font-semibold text-gray-900">
            Sık sorulan sorular
          </h3>
          <div className="mt-3 space-y-2">
            {content.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-gray-100 bg-[#f8fafc] px-4 py-3 open:bg-white open:shadow-sm"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    {faq.question}
                    <span className="shrink-0 text-sky-600 transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
