"use client";

interface StatusPillToggleProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export default function StatusPillToggle({
  label,
  name,
  checked,
  onChange,
}: StatusPillToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
        checked
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          checked ? "bg-white" : "bg-gray-400"
        }`}
      />
      {label}
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
    </button>
  );
}
