/**
 * Resmi tatil blog kapakları (yıl / tür) — neşeli SVG→PNG.
 * Çalıştır: npx tsx scripts/generate-holiday-blog-covers.ts
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { TURKEY_HOLIDAY_YEAR_END } from "../lib/turkey-public-holidays";
import { TURKEY_HOLIDAY_TYPE_PAGES } from "../lib/turkey-public-holidays";

const OUT_DIR = resolve(process.cwd(), "public/blog/covers/resmi-tatiller");
const BLOG_YEAR_START = 2026;

const YEAR_PALETTES = [
  ["#0ea5e9", "#f97316", "#fde68a"],
  ["#22c55e", "#06b6d4", "#fef08a"],
  ["#a855f7", "#ec4899", "#fce7f3"],
  ["#f59e0b", "#ef4444", "#fdba74"],
  ["#14b8a6", "#3b82f6", "#a5f3fc"],
  ["#e11d48", "#f97316", "#fecdd3"],
  ["#6366f1", "#22d3ee", "#e0e7ff"],
  ["#84cc16", "#facc15", "#ecfccb"],
];

const TYPE_THEMES: Record<
  string,
  { title: string; colors: [string, string, string]; motif: string }
> = {
  "yilbasi-resmi-tatil-gunleri": {
    title: "Yılbaşı",
    colors: ["#1e3a8a", "#f59e0b", "#fef3c7"],
    motif: "✦",
  },
  "23-nisan-ulusal-egemenlik-ve-cocuk-bayrami": {
    title: "23 Nisan",
    colors: ["#be123c", "#fbbf24", "#fecaca"],
    motif: "★",
  },
  "1-mayis-emek-ve-dayanisma-gunu": {
    title: "1 Mayıs",
    colors: ["#b91c1c", "#f97316", "#fed7aa"],
    motif: "✿",
  },
  "19-mayis-ataturk-anma-genclik-ve-spor-bayrami": {
    title: "19 Mayıs",
    colors: ["#0369a1", "#22c55e", "#bae6fd"],
    motif: "☀",
  },
  "15-temmuz-demokrasi-ve-milli-birlik-gunu": {
    title: "15 Temmuz",
    colors: ["#1d4ed8", "#eab308", "#dbeafe"],
    motif: "☾",
  },
  "30-agustos-zafer-bayrami": {
    title: "30 Ağustos",
    colors: ["#b45309", "#dc2626", "#fde68a"],
    motif: "◆",
  },
  "29-ekim-cumhuriyet-bayrami": {
    title: "29 Ekim",
    colors: ["#b91c1c", "#ffffff", "#fecaca"],
    motif: "☾",
  },
  "ramazan-bayrami-resmi-tatil-tarihleri": {
    title: "Ramazan",
    colors: ["#0f766e", "#fbbf24", "#ccfbf1"],
    motif: "☽",
  },
  "kurban-bayrami-resmi-tatil-tarihleri": {
    title: "Kurban",
    colors: ["#166534", "#a3e635", "#dcfce7"],
    motif: "✧",
  },
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function yearSvg(year: number, colors: [string, string, string]) {
  const [c1, c2, c3] = colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#g)"/>
  <circle cx="180" cy="140" r="90" fill="#ffffff" fill-opacity="0.18"/>
  <circle cx="1040" cy="620" r="140" fill="#ffffff" fill-opacity="0.14"/>
  <circle cx="980" cy="120" r="50" fill="#ffffff" fill-opacity="0.22"/>
  <text x="80" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff" fill-opacity="0.95">Resmi Tatiller</text>
  <text x="80" y="430" font-family="Segoe UI, Arial, sans-serif" font-size="220" font-weight="800" fill="#ffffff">${year}</text>
  <text x="90" y="520" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="600" fill="#ffffff" fill-opacity="0.95">Türkiye Bayram Takvimi</text>
  <text x="90" y="590" font-family="Segoe UI, Arial, sans-serif" font-size="32" fill="#ffffff" fill-opacity="0.88">Villa tatili için neşeli plan ✦</text>
</svg>`;
}

function typeSvg(
  title: string,
  colors: [string, string, string],
  motif: string
) {
  const [c1, c2, c3] = colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
  <defs>
    <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="50%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#g)"/>
  <text x="900" y="180" font-size="120" fill="#ffffff" fill-opacity="0.25">${escapeXml(motif)}</text>
  <text x="120" y="200" font-size="100" fill="#ffffff" fill-opacity="0.3">${escapeXml(motif)}</text>
  <text x="80" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="700" fill="#ffffff" fill-opacity="0.95">Resmi Tatiller</text>
  <text x="80" y="400" font-family="Segoe UI, Arial, sans-serif" font-size="96" font-weight="800" fill="#ffffff">${escapeXml(title)}</text>
  <text x="90" y="500" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="600" fill="#ffffff" fill-opacity="0.95">2026–${TURKEY_HOLIDAY_YEAR_END} tarihleri</text>
  <text x="90" y="580" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#ffffff" fill-opacity="0.9">Tatil planına neşe katın</text>
</svg>`;
}

async function writePng(fileName: string, svg: string) {
  const out = resolve(OUT_DIR, fileName);
  await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(out);
  console.log(out);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (let year = BLOG_YEAR_START; year <= TURKEY_HOLIDAY_YEAR_END; year += 1) {
    const palette = YEAR_PALETTES[(year - BLOG_YEAR_START) % YEAR_PALETTES.length];
    await writePng(
      `yil-${year}.png`,
      yearSvg(year, palette as [string, string, string])
    );
  }

  for (const page of TURKEY_HOLIDAY_TYPE_PAGES) {
    const theme = TYPE_THEMES[page.slug] ?? {
      title: page.shortTitle,
      colors: ["#0ea5e9", "#6366f1", "#e0f2fe"] as [string, string, string],
      motif: "✦",
    };
    await writePng(`tur-${page.slug}.png`, typeSvg(theme.title, theme.colors, theme.motif));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
