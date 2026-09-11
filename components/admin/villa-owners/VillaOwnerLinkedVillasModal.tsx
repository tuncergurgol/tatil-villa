"use client";

import Image from "next/image";
import { Home, X } from "lucide-react";
import type { VillaOwnerListItem } from "@/lib/queries/villa-owners";
import { villaAdminEditPath } from "@/lib/villa-admin-path";

interface VillaOwnerLinkedVillasModalProps {
  owner: VillaOwnerListItem;
  onClose: () => void;
}

export default function VillaOwnerLinkedVillasModal({
  owner,
  onClose,
}: VillaOwnerLinkedVillasModalProps) {
  function openVillaEdit(villa: VillaOwnerListItem["villas"][number]) {
    window.open(villaAdminEditPath(villa), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-sky-600" />
            <div>
              <h2 className="text-base font-bold text-gray-900">Bağlı Villalar</h2>
              <p className="text-sm text-gray-500">{owner.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {owner.villas.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-gray-100 bg-gray-50/95 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Vitrin Resmi</th>
                  <th className="px-3 py-3">Villa Adı</th>
                  <th className="px-3 py-3">Villa Orijinal Adı</th>
                  <th className="px-3 py-3">Belge No</th>
                </tr>
              </thead>
              <tbody>
                {owner.villas.map((villa) => (
                  <tr
                    key={villa.id}
                    onClick={() => openVillaEdit(villa)}
                    className="cursor-pointer border-b border-gray-100 transition hover:bg-sky-50/60"
                  >
                    <td className="px-5 py-3">
                      <div className="relative h-14 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        {villa.image ? (
                          <Image
                            src={villa.image}
                            alt={villa.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-gray-400">
                            Resim yok
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-gray-900">
                      {villa.name}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {villa.originalName.trim() || "—"}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {villa.documentNo.trim() || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-16 text-center text-sm text-gray-500">
              Bu villa sahibine bağlı villa bulunamadı.
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
