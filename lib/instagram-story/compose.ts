import sharp from "sharp";
import { resolveStoryFontPair } from "@/lib/instagram-story/fonts";
import {
  INSTAGRAM_STORY_HEIGHT,
  INSTAGRAM_STORY_WIDTH,
  type InstagramStoryComposeInput,
} from "@/lib/instagram-story/types";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeHex(color: string | undefined): string {
  const value = (color ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return "#0d9488";
}

function estimateTextWidth(text: string, fontSize: number): number {
  // Approx Latin/Turkish glyph width for CTA pill sizing
  return Math.ceil(text.length * fontSize * 0.58);
}

export async function composeInstagramStoryFrame(
  input: InstagramStoryComposeInput
): Promise<Buffer> {
  const fonts = resolveStoryFontPair();
  const accent = normalizeHex(input.accentColor);
  const W = INSTAGRAM_STORY_WIDTH;
  const H = INSTAGRAM_STORY_HEIGHT;

  const photoBuf = await sharp(input.photoBuffer, { failOn: "none" })
    .rotate()
    .resize(W, H, { fit: "cover", position: "attention" })
    .modulate({ brightness: 1.02, saturation: 1.08 })
    .toBuffer();

  let logoComposite:
    | { input: Buffer; left: number; top: number }
    | null = null;

  if (input.logoBuffer && input.logoBuffer.length > 0) {
    const logoPng = await sharp(input.logoBuffer, {
      failOn: "none",
      density: 400,
    })
      .resize({ width: 420, withoutEnlargement: false })
      .png()
      .toBuffer();
    const logoMeta = await sharp(logoPng).metadata();
    const logoW = logoMeta.width ?? 420;
    const logoH = logoMeta.height ?? 168;
    logoComposite = {
      input: logoPng,
      left: 70 + Math.round((460 - logoW) / 2),
      top: 86 + Math.round((150 - logoH) / 2),
    };
  }

  const ctaText = input.ctaLabel.trim() || "tatildeyiz.com.tr";
  const ctaWidth = Math.min(
    820,
    Math.max(360, estimateTextWidth(ctaText, 28) + 80)
  );

  const overlay = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face{font-family:'StorySans';src:${fonts.regularCss} format('truetype');}
      @font-face{font-family:'StorySansBold';src:${fonts.boldCss} format('truetype');}
    </style>
    <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#041016" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#041016" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#041016" stop-opacity="0"/>
      <stop offset="38%" stop-color="#041016" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#041016" stop-opacity="0.88"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="430" fill="url(#topFade)"/>
  <rect y="1180" width="${W}" height="740" fill="url(#bottomFade)"/>
  ${
    logoComposite
      ? `<rect x="70" y="86" rx="28" ry="28" width="460" height="150" fill="#ffffff" fill-opacity="0.94"/>`
      : ""
  }
  <text x="90" y="1480" font-family="StorySans" font-size="28" letter-spacing="3.2" fill="#f8fafc">${escapeXml(input.tagline.toUpperCase())}</text>
  <text x="90" y="1572" font-family="StorySansBold" font-size="64" fill="#ffffff">${escapeXml(input.name)}</text>
  <text x="90" y="1638" font-family="StorySans" font-size="32" fill="#e2e8f0">${escapeXml(input.location)}</text>
  <rect x="90" y="1674" rx="22" ry="22" width="620" height="56" fill="#ffffff" fill-opacity="0.16"/>
  <text x="118" y="1712" font-family="StorySans" font-size="26" fill="#ffffff">${escapeXml(input.meta)}</text>
  <rect x="90" y="1760" rx="32" ry="32" width="${ctaWidth}" height="72" fill="${accent}"/>
  <text x="132" y="1806" font-family="StorySansBold" font-size="28" fill="#ffffff">${escapeXml(ctaText)}</text>
</svg>`);

  const layers: sharp.OverlayOptions[] = [
    { input: overlay, left: 0, top: 0 },
  ];
  if (logoComposite) layers.push(logoComposite);

  return sharp(photoBuf)
    .composite(layers)
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
