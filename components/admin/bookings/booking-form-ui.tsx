export const bookingInputClass =
  "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";

export const bookingReadonlyClass =
  "w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700";

export const bookingLabelClass =
  "text-xs font-bold uppercase tracking-wide text-gray-600";

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-gray-300 px-4 pb-4 pt-3">
      <legend className="px-2 text-sm font-semibold text-gray-800">
        {title}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

export function FormRow({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-start">
      <div className="pt-2">
        <p className={bookingLabelClass}>{label}</p>
        {hint ? <p className="mt-1 text-xs text-red-500">{hint}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function ReadonlyField({ value }: { value: string }) {
  return <div className={bookingReadonlyClass}>{value || "—"}</div>;
}

export function DiscountPercentAmountField({
  rate,
  amount,
  onRateChange,
  onAmountChange,
}: {
  rate: number;
  amount: number | null | undefined;
  onRateChange: (rate: number) => void;
  onAmountChange: (amount: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex w-36 items-center gap-1 rounded-md border border-gray-200 bg-white px-3">
        <span className="text-sm font-medium text-gray-500">%</span>
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={rate > 0 ? rate : ""}
          placeholder="0,00"
          onChange={(event) => {
            const next = event.target.value.trim();
            onRateChange(next === "" ? 0 : Number(next));
          }}
          className="w-full border-0 py-2 text-sm text-gray-900 outline-none"
        />
      </div>
      <input
        value={amount ?? ""}
        onChange={(event) => {
          const normalized = event.target.value
            .replace(/\./g, "")
            .replace(",", ".");
          if (!normalized.trim()) {
            onAmountChange(null);
            return;
          }
          const parsed = Number(normalized);
          onAmountChange(Number.isFinite(parsed) ? Math.round(parsed) : null);
        }}
        className={`${bookingInputClass} min-w-[140px] flex-1`}
      />
    </div>
  );
}
