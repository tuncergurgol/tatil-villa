"use client";

import {
  getTcKimlikBorderClass,
  getTcKimlikValidationState,
  normalizeTcKimlik,
} from "@/lib/tc-kimlik";
import { bookingInputClass } from "@/components/admin/bookings/booking-form-ui";

const defaultInputClass =
  "w-full rounded-xl border bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:bg-white focus:ring-2";

interface TcKimlikInputProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  label?: string;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "booking";
  focusPalette?: "indigo" | "blue";
  showError?: boolean;
}

export default function TcKimlikInput({
  value,
  onChange,
  name,
  id,
  placeholder = "11 haneli TC kimlik no",
  required,
  label,
  className,
  disabled,
  variant = "default",
  focusPalette = "indigo",
  showError = true,
}: TcKimlikInputProps) {
  const validationState = getTcKimlikValidationState(value);
  const borderClass = getTcKimlikBorderClass(validationState, focusPalette);
  const baseClass = variant === "booking" ? bookingInputClass : defaultInputClass;

  const input = (
    <>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={11}
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(normalizeTcKimlik(event.target.value))}
        className={`${baseClass} ${borderClass} ${className ?? ""}`.trim()}
      />
      {showError && validationState === "invalid" ? (
        <p className="mt-1 text-xs text-red-600">Geçersiz T.C. Kimlik No</p>
      ) : null}
    </>
  );

  if (!label) return input;

  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className={variant === "default" ? "mt-1.5" : "mt-1"}>{input}</div>
    </label>
  );
}
