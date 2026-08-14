import Link from "next/link";

type PublicServicePageProps = {
  title: string;
  description: string;
};

export default function PublicServicePage({
  title,
  description,
}: PublicServicePageProps) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
        Hizmetlerimiz
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
        {description}
      </p>
      <p className="mt-3 text-sm text-slate-500">
        Bu hizmet yakında aktif olacak. Şimdilik villa konaklama seçeneklerimizi
        inceleyebilirsiniz.
      </p>
      <Link
        href="/villalar"
        className="mt-8 inline-flex cursor-pointer rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
      >
        Villaları İncele
      </Link>
    </div>
  );
}
