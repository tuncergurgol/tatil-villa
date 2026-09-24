import Link from "next/link";
import { hasVillaTourismDocument } from "@/lib/villa-document-types";
import {
  getVillaOwnerPanelVillas,
  requireVillaOwnerSession,
} from "@/lib/queries/villa-owner-panel";
import {
  villaOwnerEditPath,
  villaOwnerHizliFiyatPath,
} from "@/lib/villa-admin-path";

export const dynamic = "force-dynamic";

export default async function OwnerHomePage() {
  const session = await requireVillaOwnerSession();
  const villas = await getVillaOwnerPanelVillas(session.user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Villalarım</h1>
        <p className="mt-1 text-sm text-gray-500">
          Villa bilgilerini ve hızlı fiyatı buradan güncelleyebilirsiniz.
        </p>
      </div>

      {villas.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
          Hesabınıza bağlı villa bulunmuyor.
        </div>
      ) : (
        <div className="grid gap-4">
          {villas.map((villa) => {
            const documented = hasVillaTourismDocument(villa);
            return (
              <article
                key={villa.id}
                className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {villa.name}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        documented
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {documented ? "Belgeli" : "Belgesiz"}
                    </span>
                  </div>
                  {villa.location ? (
                    <p className="mt-1 text-sm text-gray-500">{villa.location}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={villaOwnerEditPath(villa)}
                    className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    Villa Tanımla
                  </Link>
                  <Link
                    href={villaOwnerHizliFiyatPath(villa)}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Hızlı Fiyat
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
