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

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
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
  lines: PublicCheckInInfoPage["paymentLines"];
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

function InvoiceBlock({ invoice }: { invoice: NonNullable<PublicCheckInInfoPage["invoice"]> }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Fatura Tipi", value: invoice.taxpayerType },
    { label: "Ad Soyad / Ünvan", value: invoice.title },
  ];
  if (invoice.taxOffice) rows.push({ label: "Vergi Dairesi", value: invoice.taxOffice });
  if (invoice.taxNumber) rows.push({ label: "Vergi / TC No", value: invoice.taxNumber });
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
          <dd className="text-right font-medium text-slate-900">{row.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function CheckInInfoGuestView({
  page,
}: {
  page: PublicCheckInInfoPage;
}) {
  const showAccount = page.accountLines.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          {page.siteDomain} · Hoş Geldiniz
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {page.villaName}
        </h1>
        <p className="text-sm text-slate-600">{page.villaLocation}</p>
      </header>

      {!page.revealed ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Kişisel iletişim ve adres bilgileri, giriş saatine 30 saat kala
          açılır. Şimdilik kısmen gizlidir.
        </p>
      ) : null}

      <SectionCard title="Karşılama">
        <div className="space-y-3 text-sm leading-relaxed text-slate-600">
          <p className="text-lg font-semibold text-slate-900">
            Sayın {page.primaryGuestName || "Misafir"},
          </p>
          <p>
            Tatildeyiz.com.tr ailesi olarak sizlere keyifli ve unutulmaz bir
            tatil geçirmenizi dileriz..
          </p>
          <p>
            Aşağıda ev sahibinizin / karşılama sorumlusunun iletişim
            bilgilerine ulaşabilir, giriş (check-in) bilgilerinizi
            görüntüleyebilirsiniz.
          </p>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ev sahibi / Görevli
          </p>
          <p className="mt-1 text-base font-bold text-slate-900">
            {page.greeter.displayName}
          </p>
          {page.greeter.phone ? (
            <p className="mt-1 text-sm text-slate-600">{page.greeter.phone}</p>
          ) : null}
          <p className="mt-2 text-sm text-slate-500">
            Konaklamanızla ilgili her konuda size yardımcı olur. Lütfen
            kendisinden villanın/evin konumunu talep edin.
          </p>
          <div className="mt-4">
            <CheckInContactActions
              phone={page.greeter.phoneForActions}
              enabled={page.contactActionsEnabled}
              whatsappPrefill={`Merhaba, ${page.code} nolu rezervasyon giriş bilgileri hakkında yazıyorum.`}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Rezervasyon Özeti">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          <MetaStat label="Gece" value={String(page.nights)} />
        </div>
        {page.villaAddress ? (
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-500">Adres: </span>
            {page.villaAddress}
          </p>
        ) : null}
      </SectionCard>

      {showAccount ? (
        <SectionCard title="Rezervasyon Ücret Bilgileri">
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
        <PaymentList lines={page.paymentLines} />
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

      {page.amenities.length > 0 ? (
        <SectionCard title="Olanaklar">
          <div className="flex flex-wrap gap-2">
            {page.amenities.slice(0, 24).map((item) => (
              <span
                key={item}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {page.description.trim() ? (
        <SectionCard title="Villa Hakkında">
          <p className="text-sm leading-relaxed text-slate-600 line-clamp-6">
            {page.description}
          </p>
        </SectionCard>
      ) : null}

      <p className="pb-6 text-center text-sm text-slate-500">
        İyi tatiller dileriz · {page.siteDomain}
      </p>
    </div>
  );
}
