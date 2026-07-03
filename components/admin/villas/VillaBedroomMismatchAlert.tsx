"use client";

interface VillaBedroomMismatchAlertProps {
  bedroomCount: number;
  roomCount: number;
}

export default function VillaBedroomMismatchAlert({
  bedroomCount,
  roomCount,
}: VillaBedroomMismatchAlertProps) {
  if (bedroomCount === roomCount) return null;

  const diff = Math.abs(bedroomCount - roomCount);
  const isExcess = roomCount > bedroomCount;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Yatak odası sayısı uyuşmuyor</p>
      <p className="mt-1">
        Genel sekmesinde <strong>{bedroomCount}</strong> yatak odası, Oda
        Yönetimi&apos;nde <strong>{roomCount}</strong> oda kayıtlı.
        {isExcess ? (
          <>
            {" "}
            <strong>{diff}</strong> fazla oda var. Sayıyı azaltıp kaydettiğinizde
            onay istenecek.
          </>
        ) : (
          <>
            {" "}
            <strong>{diff}</strong> oda eksik. Kaydettiğinizde otomatik
            eklenecek.
          </>
        )}
      </p>
    </div>
  );
}
