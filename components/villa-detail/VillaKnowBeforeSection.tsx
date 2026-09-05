"use client";

import {
  Baby,
  Ban,
  Check,
  Cigarette,
  Dog,
  DoorClosed,
  DoorOpen,
  Music,
  UsersRound,
  X,
} from "lucide-react";
import { formatNightlyAmount } from "@/lib/villa-period-calendar";
import VillaNaturePestNoticeBlock from "@/components/villa-detail/VillaNaturePestNoticeBlock";

type PriceItem = {
  id: string;
  description: string;
};

type DamageDeposit = {
  amount: number;
  currency: string;
} | null;

type VillaKnowBeforeSectionProps = {
  checkInTime: string;
  checkOutTime: string;
  allowBaby: boolean;
  allowChildren: boolean;
  allowPets: boolean;
  allowSmoking: boolean;
  allowEvents: boolean;
  showNaturePestNotice: boolean;
  customRules: string[];
  priceIncluded: PriceItem[];
  priceExcluded: PriceItem[];
  damageDeposit: DamageDeposit;
};

function parseTimeToMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function formatTimeLabel(value: string) {
  const minutes = parseTimeToMinutes(value);
  if (minutes == null) return value;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatDepositAmount(amount: number, currency: string) {
  const value = formatNightlyAmount(amount);
  if (currency === "TL") return `${value}₺`;
  return `${value} ${currency}`;
}

function TimeRangeTimeline({
  start,
  end,
  title,
  description,
  icon: Icon,
}: {
  start: string;
  end: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  const startMin = parseTimeToMinutes(start) ?? 0;
  const endMin = parseTimeToMinutes(end) ?? startMin;
  const safeEnd = Math.max(endMin, startMin + 30);
  const left = (startMin / (24 * 60)) * 100;
  const width = ((safeEnd - startMin) / (24 * 60)) * 100;
  const mid = left + width / 2;
  const rangeLabel = `${formatTimeLabel(start)} - ${formatTimeLabel(end)} Arası`;

  return (
    <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="relative pt-8 pb-5">
        <div
          className="absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
          style={{ left: `${mid}%` }}
        >
          {rangeLabel}
          <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-slate-800" />
        </div>

        <div className="relative h-2.5 overflow-visible rounded-full bg-slate-100">
          <div
            className="absolute inset-y-0 rounded-full bg-slate-800"
            style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-600">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>
    </div>
  );
}

function RuleIconCard({
  allowed,
  allowedLabel,
  deniedLabel,
  icon: Icon,
}: {
  allowed: boolean;
  allowedLabel: string;
  deniedLabel: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-3 py-2 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center text-slate-500">
        <Icon className="h-10 w-10" strokeWidth={1.4} />
        {!allowed ? (
          <Ban
            className="absolute inset-0 m-auto h-16 w-16 text-slate-400"
            strokeWidth={1.15}
          />
        ) : null}
      </div>
      <p className="max-w-[9.5rem] text-sm font-medium leading-snug text-slate-700">
        {allowed ? allowedLabel : deniedLabel}
      </p>
    </div>
  );
}

export default function VillaKnowBeforeSection({
  checkInTime,
  checkOutTime,
  allowBaby,
  allowChildren,
  allowPets,
  allowSmoking,
  allowEvents,
  showNaturePestNotice,
  customRules,
  priceIncluded,
  priceExcluded,
  damageDeposit,
}: VillaKnowBeforeSectionProps) {
  const checkInStart = checkInTime || "16:00";
  const checkOutEnd = checkOutTime || "10:00";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Bilmeniz Gerekenler
        </h2>

        <div className="mt-6 space-y-7">
          <TimeRangeTimeline
            icon={DoorOpen}
            title="Check-in"
            description="En erken ve en geç tesise giriş yapabileceğiniz saatler."
            start={checkInStart}
            end="23:00"
          />
          <TimeRangeTimeline
            icon={DoorClosed}
            title="Check-out"
            description="En geç tesisten çıkış yapabileceğiniz saatler."
            start="08:00"
            end={checkOutEnd}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 px-4 py-5 sm:px-6">
        <h3 className="text-lg font-bold text-slate-900">Tesis Kuralları</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <RuleIconCard
            icon={Baby}
            allowed={allowBaby}
            allowedLabel="Bebeğe Uygun"
            deniedLabel="Bebeğe Uygun Değil"
          />
          <RuleIconCard
            icon={UsersRound}
            allowed={allowChildren}
            allowedLabel="Çocuğa Uygun"
            deniedLabel="Çocuğa Uygun Değil"
          />
          <RuleIconCard
            icon={Dog}
            allowed={allowPets}
            allowedLabel="Evcil Hayvan Kabul Edilir"
            deniedLabel="Evcil Hayvan Kabul Edilmez"
          />
          <RuleIconCard
            icon={Cigarette}
            allowed={allowSmoking}
            allowedLabel="Sigara İçilebilir"
            deniedLabel="Sigara İçilmez"
          />
          <RuleIconCard
            icon={Music}
            allowed={allowEvents}
            allowedLabel="Parti / Etkinlik Yapılabilir"
            deniedLabel="Parti Yapılmaz"
          />
        </div>
        {customRules.length > 0 ? (
          <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4">
            {customRules.map((rule) => (
              <li
                key={rule}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                {rule}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Ücrete Dahil olanlar
          </h3>
          {priceIncluded.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {priceIncluded.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 text-[15px] text-slate-700"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  {item.description}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Dahil kalem tanımlanmamış.
            </p>
          )}

          {priceExcluded.length > 0 ? (
            <div className="mt-7">
              <h4 className="text-base font-bold text-slate-900">
                Ücrete Dahil olmayanlar
              </h4>
              <ul className="mt-3 space-y-3">
                {priceExcluded.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 text-[15px] text-slate-700"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    {item.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">Hasar Depozitosu</h3>
          {damageDeposit ? (
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              Depozito ücreti{" "}
              <strong className="font-bold text-slate-900">
                {formatDepositAmount(
                  damageDeposit.amount,
                  damageDeposit.currency
                )}
              </strong>{" "}
              olarak belirlenmiştir. Konaklama süresince tesiste herhangi bir
              zarar olmaması durumunda çıkışta{" "}
              <span className="font-bold underline decoration-slate-400 underline-offset-2">
                iade edilir
              </span>
              .
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Güncel dönem için hasar depozitosu tanımlanmamış.
            </p>
          )}
        </div>
      </div>

      {showNaturePestNotice ? <VillaNaturePestNoticeBlock /> : null}
    </div>
  );
}
