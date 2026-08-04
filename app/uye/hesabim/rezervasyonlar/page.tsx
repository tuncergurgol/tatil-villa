import Link from "next/link";
import { getCurrentMember } from "@/lib/member-session.server";
import { findMemberBookings } from "@/lib/member-account";

function formatDate(value: Date) {
  return value.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function MemberReservationsPage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const bookings = await findMemberBookings(member);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Rezervasyonlarım</h2>
        <p className="mt-1 text-sm text-slate-600">
          Telefon veya e-posta ile eşleşen tüm rezervasyonlarınız.
        </p>
      </div>
      {bookings.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
          Henüz rezervasyon bulunamadı.
        </p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {booking.villa.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                  </p>
                  {booking.externalCode ? (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Kod: {booking.externalCode}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {booking.status}
                  </span>
                  {booking.totalPrice ? (
                    <p className="mt-2 text-sm font-bold text-slate-900">
                      {booking.totalPrice.toLocaleString("tr-TR")} TL
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/giris-bilgilendirme/${booking.id}`}
                  className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  Giriş Bilgilendirme
                </Link>
                <Link
                  href={`/villalar/${booking.villa.slug}`}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Villayı Gör
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
