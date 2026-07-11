"use client";

import type { ReactNode } from "react";
import {
  getTurkishPhoneLocalPart,
  normalizeStoredTurkishPhone,
} from "@/lib/phone-utils";

type FocusPalette = "teal" | "indigo" | "blue" | "violet";

const focusClasses: Record<FocusPalette, string> = {
  teal: "focus-within:border-teal-300 focus-within:ring-teal-100",
  indigo: "focus-within:border-indigo-300 focus-within:ring-indigo-100",
  blue: "focus-within:border-blue-300 focus-within:ring-blue-100",
  violet: "focus-within:border-violet-300 focus-within:ring-violet-100",
};

interface TurkishPhoneFieldProps {
  name?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  focusPalette?: FocusPalette;
  compact?: boolean;
  hideLabel?: boolean;
  error?: string;
  suffix?: ReactNode;
  className?: string;
  disabled?: boolean;
}

function toLocalDisplay(value: string): string {
  return getTurkishPhoneLocalPart(value);
}

export function normalizeTurkishPhoneFieldValue(value: string): string {
  return normalizeStoredTurkishPhone(value);
}

export default function TurkishPhoneField({
  name,
  label = "Telefon",
  value,
  defaultValue = "",
  onChange,
  onBlur,
  required,
  placeholder = "5xx xxx xx xx",
  focusPalette = "teal",
  compact = false,
  hideLabel = false,
  error,
  suffix,
  className = "",
  disabled = false,
}: TurkishPhoneFieldProps) {
  const isControlled = value !== undefined;
  const displayValue = isControlled ? toLocalDisplay(value) : toLocalDisplay(defaultValue);
  const roundedClass = compact ? "rounded-lg" : "rounded-xl";
  const paddingClass = compact ? "px-3 py-2" : "px-4 py-3";

  function handleChange(nextValue: string) {
    onChange?.(nextValue);
  }

  function handleBlur(nextValue: string) {
    onBlur?.(nextValue);
  }

  return (
    <label className={`block ${className}`}>
      {!hideLabel ? (
        <span className="text-xs font-medium text-gray-500">{label}</span>
      ) : null}
      <div
        className={`${hideLabel ? "" : "mt-1.5"} flex items-center gap-2 border border-gray-200 bg-gray-50/80 transition focus-within:bg-white focus-within:ring-2 ${roundedClass} ${paddingClass} ${focusClasses[focusPalette]} ${disabled ? "opacity-60" : ""}`}
      >
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-gray-700">
          <span aria-hidden>🇹🇷</span>
          <span>+90</span>
        </span>
        <input
          name={name}
          value={isControlled ? displayValue : undefined}
          defaultValue={isControlled ? undefined : displayValue}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={(event) => handleBlur(event.target.value)}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          inputMode="tel"
          autoComplete="tel-national"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
        />
        {suffix}
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
