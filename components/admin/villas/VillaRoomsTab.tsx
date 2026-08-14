"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Building2, Download, Pencil } from "lucide-react";
import type { VillaRoom } from "@prisma/client";
import { importVillaRoomsFromTatildeyiz } from "@/app/actions/admin/villa-rooms";
import VillaBedroomMismatchAlert from "@/components/admin/villas/VillaBedroomMismatchAlert";
import VillaRoomEditModal from "@/components/admin/villas/VillaRoomEditModal";
import {
  formatBedSummary,
  getRoomTypeLabel,
} from "@/lib/villa-room-features";

interface VillaRoomsTabProps {
  villaId: string;
  villaName: string;
  bedroomCount: number;
  rooms: VillaRoom[];
  galleryImages: string[];
}

export default function VillaRoomsTab({
  villaId,
  villaName,
  bedroomCount,
  rooms,
  galleryImages,
}: VillaRoomsTabProps) {
  const router = useRouter();
  const [editingRoom, setEditingRoom] = useState<VillaRoom | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, startImport] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleImportFromTatildeyiz() {
    setImportMessage(null);
    setImportError(null);
    startImport(async () => {
      const result = await importVillaRoomsFromTatildeyiz(villaId);
      if (result.error) {
        setImportError(result.error);
        return;
      }
      setImportMessage(result.message ?? "Odalar içe aktarıldı");
      refresh();
    });
  }

  return (
    <div className="space-y-5">
      <VillaBedroomMismatchAlert
        bedroomCount={bedroomCount}
        roomCount={rooms.length}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-600" />
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              {villaName} — Oda Yönetimi
            </h2>
            <p className="text-sm text-gray-500">
              Toplam <strong>{rooms.length}</strong> oda kayıtlı
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleImportFromTatildeyiz}
            disabled={isImporting}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isImporting ? "İçe aktarılıyor..." : "Tatildeyiz'den İçe Aktar"}
          </button>
          <p className="text-xs text-gray-500">
            Yatak odası sayısı Genel sekmesinden belirlenir ({bedroomCount})
          </p>
        </div>
      </div>

      {importMessage ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {importMessage}
        </p>
      ) : null}
      {importError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {importError}
        </p>
      ) : null}

      {rooms.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room, index) => (
            <article
              key={room.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="relative aspect-[4/3] bg-gray-200">
                <span className="absolute left-3 top-3 z-10 rounded-full bg-gray-700 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {getRoomTypeLabel(room.roomType)}
                </span>
                {room.imageUrl ? (
                  <Image
                    src={room.imageUrl}
                    alt={room.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    <BedDouble className="h-16 w-16 opacity-30" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="text-xs font-medium text-gray-400">{index + 1}</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <BedDouble className="h-4 w-4" />
                  {formatBedSummary(room.singleBeds, room.doubleBeds)}
                </div>

                {room.features.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {room.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-400">
                    Henüz özellik eklenmedi
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setEditingRoom(room)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4 text-blue-600" />
                  Düzenle
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-700">
            Henüz oda kaydı yok
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Genel sekmesinde yatak odası sayısını belirleyin.
          </p>
        </div>
      )}

      {editingRoom ? (
        <VillaRoomEditModal
          villaId={villaId}
          villaName={villaName}
          room={editingRoom}
          galleryImages={galleryImages}
          onClose={() => setEditingRoom(null)}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}
