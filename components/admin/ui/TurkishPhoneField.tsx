interface TurkishPhoneFieldProps {
  name: string;
  label?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}

export default function TurkishPhoneField({
  name,
  label = "Telefon",
  defaultValue = "",
  required,
  placeholder = "5xx xxx xx xx",
}: TurkishPhoneFieldProps) {
  const displayValue = defaultValue.replace(/^\+90\s?/, "");

  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 transition focus-within:border-teal-300 focus-within:bg-white focus-within:ring-2 focus:ring-teal-100">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-gray-700">
          <span aria-hidden>🇹🇷</span>
          <span>+90</span>
        </span>
        <input
          name={name}
          defaultValue={displayValue}
          required={required}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
        />
      </div>
    </label>
  );
}
