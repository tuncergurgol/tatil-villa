"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Building2, Pencil, Trash2 } from "lucide-react";
import type { VillaRoom } from "@prisma/client";
import { deleteVillaRoom } from "@/app/actions/admin/villa-rooms";
import VillaBedroomMismatchAlert from "@/components/admin/villas/VillaBedroomMismatchAlert";
import VillaRoomEditModal from "@/components/admin/villas/VillaRoomEditModal";
import {
  formatBedSummary,
  getRoomTypeLabel,
  uniqueRoomFeatures,
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
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleDelete(room: VillaRoom) {
    const label = `${getRoomTypeLabel(room.roomType)} — ${room.name}`;
    if (
      !window.confirm(
        `"${label}" oda kaydı silinsin mi? Bu işlem geri alınamaz.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteVillaRoom(villaId, room.id);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      if (editingRoom?.id === room.id) {
        setEditingRoom(null);
      }
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
        <p className="text-xs text-gray-500">
          Yatak odası sayısı Genel sekmesinden belirlenir ({bedroomCount})
        </p>
      </div>

      {rooms.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room, index) => {
            const roomFeatures = uniqueRoomFeatures(room.features);
            return (
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

                {roomFeatures.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {roomFeatures.map((feature) => (
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

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRoom(room)}
                    disabled={isPending}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4 text-blue-600" />
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(room)}
                    disabled={isPending}
                    aria-label="Odayı sil"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Sil
                  </button>
                </div>
              </div>
            </article>
            );
          })}
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
          villaCustomFeatures={uniqueRoomFeatures(
            rooms.flatMap((item) => item.customFeatures)
          )}
          galleryImages={galleryImages}
          onClose={() => setEditingRoom(null)}
          onSaved={refresh}
          onDeleted={refresh}
        />
      ) : null}
    </div>
  );
}
