"use client";

import { useMemo, useState, useTransition } from "react";
import { submitYeniOtelRequest } from "@/app/actions/yeni-otel-request";
import {
  formatTry,
  nightsBetween,
  quoteStay,
  type HotelProperty,
} from "@/lib/yeni-otel/catalog";

type Props = {
  hotel: HotelProperty;
};

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function YeniOtelPage({ hotel }: Props) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomCount, setRoomCount] = useState(1);
  const [boardId, setBoardId] = useState(hotel.boards[0]?.id ?? "");
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const guests = adults + children;
  const board = hotel.boards.find((item) => item.id === boardId) ?? hotel.boards[0]!;
  const selectedRoom = hotel.rooms.find((room) => room.id === roomId) ?? null;
  const datesReady = nights >= 1 && nights <= 30;

  const quotes = useMemo(() => {
    if (!datesReady) return new Map<string, ReturnType<typeof quoteStay>>();
    return new Map(
      hotel.rooms.map((room) => [
        room.id,
        quoteStay({
          room,
          board,
          checkIn,
          nights,
          adults,
          roomCount,
        }),
      ])
    );
  }, [adults, board, checkIn, datesReady, hotel.rooms, nights, roomCount]);

  const selectedQuote = selectedRoom ? quotes.get(selectedRoom.id) : undefined;

  function submit() {
    setError(null);
    setMessage(null);
    if (!selectedRoom || !datesReady) {
      setError("Tarih ve oda seçin.");
      return;
    }
    startTransition(async () => {
      const result = await submitYeniOtelRequest({
        hotelSlug: hotel.slug,
        roomId: selectedRoom.id,
        boardId: board.id,
        checkIn,
        checkOut,
        adults,
        children,
        roomCount,
        name,
        phone,
        email,
        note,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Talebiniz alındı. Müsaitlik onayından sonra sizi arayacağız.");
      setName("");
      setPhone("");
      setEmail("");
      setNote("");
    });
  }

  return (
    <div className="bg-stone-50 text-stone-800">
      <section className="bg-stone-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-200">
            YENİ OTEL
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{hotel.name}</h1>
          <p className="mt-2 text-stone-300">{hotel.location}</p>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-stone-200">
            {hotel.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {hotel.highlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/15 px-3 py-1 text-xs"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-semibold text-stone-900">Konaklama ara</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <label className="text-xs text-stone-500">
                Giriş
                <input
                  type="date"
                  min={todayIso()}
                  value={checkIn}
                  onChange={(event) => setCheckIn(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
                />
              </label>
              <label className="text-xs text-stone-500">
                Çıkış
                <input
                  type="date"
                  min={checkIn || todayIso()}
                  value={checkOut}
                  onChange={(event) => setCheckOut(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
                />
              </label>
              <label className="text-xs text-stone-500">
                Yetişkin
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={adults}
                  onChange={(event) => setAdults(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
                />
              </label>
              <label className="text-xs text-stone-500">
                Çocuk
                <input
                  type="number"
                  min={0}
                  max={8}
                  value={children}
                  onChange={(event) => setChildren(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
                />
              </label>
              <label className="text-xs text-stone-500">
                Oda
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={roomCount}
                  onChange={(event) => setRoomCount(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {hotel.boards.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBoardId(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    board.id === item.id
                      ? "bg-red-700 text-white"
                      : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-stone-500">
              {datesReady
                ? `${nights} gece · ${guests} misafir · ${roomCount} oda`
                : "Fiyat için giriş ve çıkış tarihi seçin."}{" "}
              Tutarlar örnek tarifedir.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-stone-900">Odalar</h2>
            {hotel.rooms.map((room) => {
              const fits = guests <= room.maxGuests * roomCount;
              const quote = quotes.get(room.id);
              const selected = room.id === roomId;
              return (
                <article
                  key={room.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm ${
                    selected ? "border-red-700" : "border-stone-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-stone-900">
                        {room.name}
                      </h3>
                      <p className="mt-1 text-sm text-stone-600">{room.summary}</p>
                    </div>
                    <p className="text-sm text-stone-500">{room.sizeM2} m²</p>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600">
                    {room.beds.map((bed) => (
                      <li key={bed} className="rounded-full bg-stone-100 px-2.5 py-1">
                        {bed}
                      </li>
                    ))}
                    {room.features.map((feature) => (
                      <li
                        key={feature}
                        className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900"
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-stone-600">
                      En fazla {room.maxGuests} kişi
                      {!fits ? " · bu arama için kapasite yetersiz" : ""}
                    </p>
                    <div className="text-right">
                      {quote ? (
                        <>
                          <p className="text-lg font-semibold text-stone-900">
                            {formatTry(quote.total)}
                          </p>
                          <p className="text-xs text-stone-500">
                            {formatTry(quote.roomNightly)} / gece · {board.label}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-stone-500">Tarih girince fiyat</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!fits || !datesReady}
                    onClick={() => setRoomId(room.id)}
                    className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    {selected ? "Seçildi" : "Bu odayı seç"}
                  </button>
                </article>
              );
            })}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            {hotel.facilities.map((group) => (
              <div key={group.title} className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-stone-900">{group.title}</h2>
                <ul className="mt-3 space-y-1 text-sm text-stone-600">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">Konum</h2>
            <p className="mt-2 text-sm text-stone-600">{hotel.address}</p>
            <p className="mt-1 text-xs text-stone-500">
              Turizm İşletme Belgesi: {hotel.licenseNo} · Giriş {hotel.checkIn} · Çıkış{" "}
              {hotel.checkOut}
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {hotel.distances.map((item) => (
                <li
                  key={item.label}
                  className="flex justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
                >
                  <span>{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">Bilmeniz gerekenler</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-600">
              {hotel.notes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            {hotel.faqs.map((item) => (
              <details key={item.question} className="rounded-2xl bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-sm font-medium text-stone-900">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm text-stone-600">{item.answer}</p>
              </details>
            ))}
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-base font-semibold text-stone-900">Rezervasyon talebi</h2>
          {selectedRoom && selectedQuote ? (
            <p className="mt-2 text-sm text-stone-600">
              {selectedRoom.name}
              <br />
              {nights} gece · {board.label}
              <br />
              <span className="font-semibold text-stone-900">
                {formatTry(selectedQuote.total)}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-stone-500">
              Tarih seçip bir oda işaretleyin. Ödeme bu adımda alınmaz.
            </p>
          )}
          <div className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ad soyad"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Telefon"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-posta (isteğe bağlı)"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Not"
              rows={3}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={pending || !selectedRoom}
              onClick={submit}
              className="w-full rounded-lg bg-red-700 py-2.5 text-sm font-semibold text-white disabled:bg-stone-300"
            >
              {pending ? "Gönderiliyor..." : "Talep bırak"}
            </button>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
