import { existsSync, readFileSync } from "fs";
import path from "path";

export type StoryFontPair = {
  regular: string;
  bold: string;
  regularCss: string;
  boldCss: string;
};

function toDataUrl(filePath: string): string {
  const b64 = readFileSync(filePath).toString("base64");
  return `url('data:font/ttf;base64,${b64}')`;
}

export function resolveStoryFontPair(): StoryFontPair {
  const cwd = process.cwd();
  const candidates: Array<{ regular: string; bold: string }> = [
    {
      regular: path.join(cwd, "assets", "fonts", "DejaVuSans.ttf"),
      bold: path.join(cwd, "assets", "fonts", "DejaVuSans-Bold.ttf"),
    },
    {
      regular: path.join(cwd, "assets", "fonts", "Arial.ttf"),
      bold: path.join(cwd, "assets", "fonts", "Arial-Bold.ttf"),
    },
    {
      regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    },
    {
      regular: "C:\\Windows\\Fonts\\arial.ttf",
      bold: "C:\\Windows\\Fonts\\arialbd.ttf",
    },
  ];

  for (const pair of candidates) {
    if (existsSync(pair.regular) && existsSync(pair.bold)) {
      return {
        ...pair,
        regularCss: toDataUrl(pair.regular),
        boldCss: toDataUrl(pair.bold),
      };
    }
  }

  throw new Error(
    "Story yazı tipi bulunamadı (DejaVu/Arial). assets/fonts veya sistem fontlarını kontrol edin."
  );
}
