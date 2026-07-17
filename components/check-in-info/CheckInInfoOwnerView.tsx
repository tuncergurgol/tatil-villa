import type { PublicCheckInInfoPage } from "@/lib/queries/check-in-info";
import CheckInContactActions from "@/components/check-in-info/CheckInContactActions";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StayDateColumn({
  label,
  dateLabel,
  weekdayLabel,
  timeLabel,
  timeValue,
}: {
  label: string;
  dateLabel: string;
  weekdayLabel: string;
  timeLabel: string;
  timeValue: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{dateLabel}</p>
      <p className="mt-1 text-xs font-semibold capitalize text-slate-600">
        {weekdayLabel}
      </p>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {timeLabel}
      </p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{timeValue}</p>
    </div>
  );
}

function PaymentList({
  lines,
}: {
  lines: PublicCheckInInfoPage["ownerPaymentLines"];
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {lines.map((line) => (
        <li
          key={line.label}
          className="flex items-center justify-between gap-3 py-2.5 text-sm"
        >
          <span className="text-slate-600">{line.label}</span>
          <span className="font-semibold text-slate-900">{line.amountLabel}</span>
        </li>
      ))}
    </ul>
  );
}

function InvoiceBlock({
  invoice,
}: {
  invoice: NonNullable<PublicCheckInInfoPage["invoice"]>;
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Fatura Tipi", value: invoice.taxpayerType },
    { label: "Ad Soyad / Ünvan", value: invoice.title },
  ];
  if (invoice.taxOffice)
    rows.push({ label: "Vergi Dairesi", value: invoice.taxOffice });
  if (invoice.taxNumber)
    rows.push({ label: "Vergi / TC No", value: invoice.taxNumber });
  if (invoice.address) rows.push({ label: "Adres", value: invoice.address });
  if (invoice.district || invoice.city) {
    rows.push({
      label: "İlçe / İl",
      value: [invoice.district, invoice.city].filter(Boolean).join(" / "),
    });
  }

  return (
    <dl className="space-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-3">
          <dt className="text-slate-500">{row.label}</dt>
          <dd className="text-right font-medium text-slate-900">
            {row.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function CheckInInfoOwnerView({
  page,
}: {
  page: PublicCheckInInfoPage;
}) {
  const showAccount = page.accountLines.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          Rezervasyon Müşteri Bilgileri
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {page.villaName}
        </h1>
        <p className="text-sm text-slate-600">{page.villaLocation}</p>
      </header>

      {!page.revealed ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Misafir iletişim ve adres bilgileri, giriş saatine 30 saat kala
          açılır. Şimdilik kısmen gizlidir.
        </p>
      ) : null}

      <SectionCard title="Karşılama">
        <div className="space-y-3 text-sm leading-relaxed text-slate-600">
          <p className="text-lg font-semibold text-slate-900">
            Sayın {page.greeter.displayName},
          </p>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Misafir İletişim Bilgileri
          </p>
          <p className="mt-2 text-base font-bold text-slate-900">
            {page.guestContact.displayName},
          </p>
          {page.guestContact.phone ? (
            <p className="mt-1 text-sm text-slate-700">
              {page.guestContact.phone}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-slate-600">
            Lütfen misafirimiz ile iletişime geçiniz ve Villanın konumunu
            iletiniz.
          </p>
          <div className="mt-4">
            <CheckInContactActions
              phone={page.guestContact.phoneForActions}
              enabled={page.contactActionsEnabled}
              whatsappPrefill={`Merhaba, ${page.code} nolu rezervasyon hakkında yazıyorum.`}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Rezervasyon Özeti">
        <div className="grid grid-cols-2 gap-3">
          <StayDateColumn
            label="Giriş"
            dateLabel={page.checkInLabel}
            weekdayLabel={page.checkInWeekdayLabel}
            timeLabel="Giriş saati"
            timeValue={page.checkInTime}
          />
          <StayDateColumn
            label="Çıkış"
            dateLabel={page.checkOutLabel}
            weekdayLabel={page.checkOutWeekdayLabel}
            timeLabel="Çıkış saati"
            timeValue={page.checkOutTime}
          />
        </div>
      </SectionCard>

      {showAccount ? (
        <SectionCard title="Rezervasyon Hesabı">
          {page.accountLines.length > 0 ? (
            <PaymentList lines={page.accountLines} />
          ) : null}
          {page.accountSummaryLines.length > 0 ? (
            <ul
              className={`divide-y divide-slate-100 ${
                page.accountLines.length > 0
                  ? "mt-2 border-t border-slate-200 pt-1"
                  : ""
              }`}
            >
              {page.accountSummaryLines.map((line, index) => (
                <li
                  key={line.label}
                  className={`flex items-center justify-between gap-3 py-2.5 text-sm ${
                    index === 0 ? "font-bold text-slate-900" : "text-slate-600"
                  }`}
                >
                  <span className={index === 0 ? "text-slate-900" : undefined}>
                    {line.label}
                  </span>
                  <span
                    className={
                      index === 0
                        ? "font-bold text-slate-900"
                        : "font-semibold text-slate-900"
                    }
                  >
                    {line.amountLabel}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard title="Ödeme Dökümü">
        <PaymentList lines={page.ownerPaymentLines} />
      </SectionCard>

      {page.depositLines.length > 0 ? (
        <SectionCard title="Hasar Depozitosu">
          <ul className="divide-y divide-slate-100">
            {page.depositLines.map((line, index) => {
              const isTotal = index === page.depositLines.length - 1;
              return (
                <li
                  key={line.label}
                  className={`flex items-center justify-between gap-3 py-2.5 text-sm ${
                    isTotal
                      ? "border-t border-slate-200 font-bold text-slate-900"
                      : "text-slate-600"
                  }`}
                >
                  <span>{line.label}</span>
                  <span
                    className={
                      isTotal
                        ? "font-bold text-slate-900"
                        : "font-semibold text-slate-900"
                    }
                  >
                    {line.amountLabel}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Girişte alınır; hasar veya kesinti yoksa çıkışta iade edilir.
            Rezervasyon toplamına dahil değildir.
          </p>
        </SectionCard>
      ) : null}

      <SectionCard title="Konaklayacak Kişiler">
        <ul className="space-y-2">
          {page.stayGuests.map((guest, index) => (
            <li
              key={`${guest.fullName}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm"
            >
              <div>
                <span className="mr-2 font-semibold text-slate-400">
                  {index + 1}
                </span>
                <span className="font-medium text-slate-900">
                  {guest.fullName || "—"}
                </span>
                {guest.nationalId ? (
                  <span className="ml-2 text-xs text-slate-500">
                    {guest.nationalId}
                  </span>
                ) : null}
              </div>
              <span className="text-xs font-semibold uppercase text-slate-500">
                {guest.role}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {page.invoice ? (
        <SectionCard title="Misafir Fatura Bilgileri">
          <InvoiceBlock invoice={page.invoice} />
        </SectionCard>
      ) : null}

      <p className="pb-6 text-center text-sm text-slate-500">
        Rezervasyon no: {page.code} · tatildeyiz.com.tr
      </p>
    </div>
  );
}
