"use client";

interface VillaBedroomReduceModalProps {
  open: boolean;
  currentRoomCount: number;
  newBedroomCount: number;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function VillaBedroomReduceModal({
  open,
  currentRoomCount,
  newBedroomCount,
  isPending,
  onConfirm,
  onCancel,
}: VillaBedroomReduceModalProps) {
  if (!open) return null;

  const removedCount = currentRoomCount - newBedroomCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">
          Oda sayısında değişiklik yaptınız
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Yatak odası sayısını <strong>{newBedroomCount}</strong>&apos;e
          düşürüyorsunuz. Oda Yönetimi&apos;ndeki{" "}
          <strong>{removedCount}</strong> oda kaydı silinecek. Onaylıyor
          musunuz?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isPending ? "Kaydediliyor..." : "Onaylıyorum"}
          </button>
        </div>
      </div>
    </div>
  );
}
