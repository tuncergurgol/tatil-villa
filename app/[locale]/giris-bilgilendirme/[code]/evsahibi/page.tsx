import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckInInfoOwnerView from "@/components/check-in-info/CheckInInfoOwnerView";
import { getPublicCheckInInfo } from "@/lib/queries/check-in-info";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const result = await getPublicCheckInInfo({
    code,
    audience: "owner",
  });
  if (!result.ok) {
    return {
      title: "Rezervasyon Müşteri Bilgileri",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Rezervasyon Müşteri Bilgileri — ${result.page.villaName}`,
    robots: { index: false, follow: false },
  };
}

export default async function CheckInInfoOwnerPage({ params }: PageProps) {
  const { code } = await params;
  const result = await getPublicCheckInInfo({
    code,
    audience: "owner",
  });

  if (!result.ok) {
    if (result.expired) redirect("/");
    return (
      <div className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">
            Rezervasyon Müşteri Bilgileri
          </h1>
          <p className="mt-3 text-sm text-red-600">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-slate-50">
      <CheckInInfoOwnerView page={result.page} />
    </div>
  );
}
