import type { ReactNode } from "react";

type SectionVariant = "white" | "gradient";

const variantClasses: Record<SectionVariant, string> = {
  white:
    "border-sky-100/80 bg-white shadow-[0_8px_30px_rgba(14,165,233,0.06)]",
  gradient:
    "border-sky-100/80 bg-[linear-gradient(135deg,#eef9ff_0%,#fff7fb_48%,#ffffff_100%)] shadow-[0_8px_30px_rgba(14,165,233,0.06)]",
};

export default function HomeContentSection({
  id,
  title,
  children,
  variant = "white",
}: {
  id: string;
  title: string;
  children: ReactNode;
  variant?: SectionVariant;
}) {
  return (
    <section
      id={id}
      className={`w-full overflow-hidden rounded-2xl border px-4 py-7 sm:rounded-3xl sm:px-6 sm:py-8 lg:px-10 ${variantClasses[variant]}`}
    >
      <h2 className="text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
        {title}
      </h2>
      <div className="mt-5 sm:mt-6">{children}</div>
    </section>
  );
}
