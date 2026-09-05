"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import {
  PHONE_COUNTRIES,
  buildE164Phone,
  countryFlagEmoji,
  getDefaultPhoneCountry,
  parseStoredPhone,
  type PhoneCountry,
} from "@/lib/phone-countries";

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
  /** E.164 (+905…) — boşsa "" */
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

/** Kayıt / form için E.164 normalize */
export function normalizeTurkishPhoneFieldValue(value: string): string {
  const parsed = parseStoredPhone(value);
  return buildE164Phone(parsed.country, parsed.national);
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
  const sourceValue = isControlled ? value : defaultValue;
  const parsed = useMemo(() => parseStoredPhone(sourceValue ?? ""), [sourceValue]);

  const [country, setCountry] = useState<PhoneCountry>(parsed.country);
  const [national, setNational] = useState(parsed.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!isControlled) return;
    const next = parseStoredPhone(value ?? "");
    setCountry(next.country);
    setNational(next.national);
  }, [isControlled, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.dial.includes(q.replace(/^\+/, "")) ||
        item.iso.toLowerCase().includes(q)
    );
  }, [query]);

  function emit(nextCountry: PhoneCountry, nextNational: string) {
    const e164 = buildE164Phone(nextCountry, nextNational);
    onChange?.(e164);
  }

  function handleNationalChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, country.maxLength);
    setNational(digits);
    emit(country, digits);
  }

  function handleSelectCountry(next: PhoneCountry) {
    setCountry(next);
    const clipped = national.slice(0, next.maxLength);
    setNational(clipped);
    setOpen(false);
    setQuery("");
    emit(next, clipped);
  }

  function handleBlur() {
    onBlur?.(buildE164Phone(country, national));
  }

  const roundedClass = compact ? "rounded-lg" : "rounded-xl";
  const paddingClass = compact ? "px-2.5 py-2" : "px-3 py-3";
  const e164 = buildE164Phone(country, national);

  return (
    <label className={`block ${className}`}>
      {!hideLabel ? (
        <span className="text-xs font-medium text-gray-500">{label}</span>
      ) : null}
      <div
        ref={rootRef}
        className={`relative ${hideLabel ? "" : "mt-1.5"}`}
      >
        <div
          className={`flex items-center gap-1.5 border border-gray-200 bg-gray-50/80 transition focus-within:bg-white focus-within:ring-2 ${roundedClass} ${paddingClass} ${focusClasses[focusPalette]} ${disabled ? "opacity-60" : ""}`}
        >
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((current) => !current)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium text-gray-800 hover:bg-white/80 disabled:cursor-not-allowed"
          >
            <span aria-hidden className="text-base leading-none">
              {countryFlagEmoji(country.iso)}
            </span>
            <span>+{country.dial}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          </button>

          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={national}
            onChange={(event) => handleNationalChange(event.target.value)}
            onBlur={handleBlur}
            required={required && !e164}
            placeholder={placeholder}
            disabled={disabled}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
          />
          {suffix}
        </div>

        {/* Form submit için gizli E.164 */}
        {name ? <input type="hidden" name={name} value={e164} /> : null}

        {open ? (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            <div className="border-b border-gray-100 p-2">
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ülke ara…"
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-teal-300"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((item) => {
                  const selected = item.iso === country.iso;
                  return (
                    <li key={`${item.iso}-${item.dial}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleSelectCountry(item)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                          selected ? "bg-gray-100" : ""
                        }`}
                      >
                        <span className="text-base leading-none" aria-hidden>
                          {countryFlagEmoji(item.iso)}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-gray-900">
                          {item.name}
                        </span>
                        <span className="shrink-0 text-gray-500">
                          +{item.dial}
                        </span>
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="px-3 py-4 text-center text-sm text-gray-500">
                  Sonuç yok
                </li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

export { PHONE_COUNTRIES };
