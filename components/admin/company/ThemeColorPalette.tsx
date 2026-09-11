"use client";

import { useState } from "react";

type ThemeColorKey =
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "surfaceColor";

type ThemeColors = Record<ThemeColorKey, string>;

const COLOR_ROWS: Array<{
  key: ThemeColorKey;
  label: string;
  hint: string;
}> = [
  {
    key: "primaryColor",
    label: "Ana Renk",
    hint: "Butonlar, linkler, vurgu alanları",
  },
  {
    key: "secondaryColor",
    label: "İkincil Renk",
    hint: "Header, footer, koyu yüzeyler",
  },
  {
    key: "accentColor",
    label: "Vurgu Rengi",
    hint: "Rozetler, ikonlar, hover durumları",
  },
  {
    key: "surfaceColor",
    label: "Yüzey Rengi",
    hint: "Arka plan, kart ve bölüm zeminleri",
  },
];

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "#000000";
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const short = /^#[0-9a-fA-F]{3}$/.test(withHash);
  if (short) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toLowerCase();
  }
  return null;
}

function ColorRow({
  label,
  hint,
  name,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  name: ThemeColorKey;
  value: string;
  onChange: (next: string) => void;
}) {
  const safe = normalizeHex(value) ?? "#000000";

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 sm:grid-cols-[minmax(0,1fr)_120px_48px]">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
      </div>
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const normalized = normalizeHex(value);
          if (normalized) onChange(normalized);
        }}
        placeholder="#0d9488"
        spellCheck={false}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm font-semibold uppercase text-gray-900 outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
      />
      <input
        type="color"
        value={safe}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        aria-label={`${label} seçici`}
        className="h-11 w-12 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
      />
    </div>
  );
}

export default function ThemeColorPalette({
  initialColors,
}: {
  initialColors: ThemeColors;
}) {
  const [colors, setColors] = useState<ThemeColors>({
    primaryColor: normalizeHex(initialColors.primaryColor) ?? "#0d9488",
    secondaryColor: normalizeHex(initialColors.secondaryColor) ?? "#115e59",
    accentColor: normalizeHex(initialColors.accentColor) ?? "#14b8a6",
    surfaceColor: normalizeHex(initialColors.surfaceColor) ?? "#f0fdfa",
  });

  function update(key: ThemeColorKey, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }));
  }

  const primary = normalizeHex(colors.primaryColor) ?? "#0d9488";
  const secondary = normalizeHex(colors.secondaryColor) ?? "#115e59";
  const accent = normalizeHex(colors.accentColor) ?? "#14b8a6";
  const surface = normalizeHex(colors.surfaceColor) ?? "#f0fdfa";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Renk Paleti</h3>
        <p className="mt-1 text-sm text-gray-500">
          4 renkli tema tablosu. Hex kodunu yazabilir veya renk seçiciden
          seçebilirsiniz.
        </p>
      </div>

      <div className="space-y-3">
        {COLOR_ROWS.map((row) => (
          <ColorRow
            key={row.key}
            label={row.label}
            hint={row.hint}
            name={row.key}
            value={colors[row.key]}
            onChange={(next) => update(row.key, next)}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Önizleme
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[primary, secondary, accent, surface].map((color) => (
            <div
              key={color}
              className="h-10 w-10 rounded-xl border border-black/5 shadow-sm"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: primary }}
          >
            Buton
          </button>
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ backgroundColor: surface, color: secondary }}
          >
            Pasif
          </button>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Vurgu
          </span>
        </div>
        <div
          className="mt-4 h-3 w-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${primary}, ${accent}, ${surface})`,
          }}
        />
      </div>
    </div>
  );
}
