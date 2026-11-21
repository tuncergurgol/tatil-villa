import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import { resolveStoryFontPair } from "@/lib/instagram-story/fonts";
import {
  INSTAGRAM_STORY_HEIGHT,
  INSTAGRAM_STORY_WIDTH,
  type InstagramStoryCollageComposeInput,
  type InstagramStoryComposeInput,
} from "@/lib/instagram-story/types";

const GAP = 10;

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
  return Math.ceil(text.length * fontSize * 0.58);
}

function truncateDisplay(text: string, maxChars: number): string {
  const value = text.trim();
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

type Slot = { left: number; top: number; width: number; height: number };

function collageSlots(count: number, W: number, H: number): Slot[] {
  const n = Math.max(1, Math.min(6, count));
  if (n === 1) return [{ left: 0, top: 0, width: W, height: H }];
  if (n === 2) {
    const w = Math.floor((W - GAP) / 2);
    return [
      { left: 0, top: 0, width: w, height: H },
      { left: w + GAP, top: 0, width: W - w - GAP, height: H },
    ];
  }
  if (n === 3) {
    const topH = Math.floor(H * 0.58);
    const bottomH = H - topH - GAP;
    const w = Math.floor((W - GAP) / 2);
    return [
      { left: 0, top: 0, width: W, height: topH },
      { left: 0, top: topH + GAP, width: w, height: bottomH },
      { left: w + GAP, top: topH + GAP, width: W - w - GAP, height: bottomH },
    ];
  }
  if (n === 4) {
    const w = Math.floor((W - GAP) / 2);
    const h = Math.floor((H - GAP) / 2);
    return [
      { left: 0, top: 0, width: w, height: h },
      { left: w + GAP, top: 0, width: W - w - GAP, height: h },
      { left: 0, top: h + GAP, width: w, height: H - h - GAP },
      { left: w + GAP, top: h + GAP, width: W - w - GAP, height: H - h - GAP },
    ];
  }
  if (n === 5) {
    const topH = Math.floor((H - GAP) / 2);
    const bottomH = H - topH - GAP;
    const topW = Math.floor((W - GAP) / 2);
    const bottomW = Math.floor((W - 2 * GAP) / 3);
    return [
      { left: 0, top: 0, width: topW, height: topH },
      { left: topW + GAP, top: 0, width: W - topW - GAP, height: topH },
      { left: 0, top: topH + GAP, width: bottomW, height: bottomH },
      {
        left: bottomW + GAP,
        top: topH + GAP,
        width: bottomW,
        height: bottomH,
      },
      {
        left: 2 * (bottomW + GAP),
        top: topH + GAP,
        width: W - 2 * (bottomW + GAP),
        height: bottomH,
      },
    ];
  }
  const w = Math.floor((W - GAP) / 2);
  const h = Math.floor((H - 2 * GAP) / 3);
  const slots: Slot[] = [];
  for (let row = 0; row < 3; row += 1) {
    const top = row * (h + GAP);
    const height = row === 2 ? H - top : h;
    slots.push({ left: 0, top, width: w, height });
    slots.push({
      left: w + GAP,
      top,
      width: W - w - GAP,
      height,
    });
  }
  return slots;
}

async function prepareTile(
  photoBuffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(photoBuffer, { failOn: "none" })
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .modulate({ brightness: 1.02, saturation: 1.08 })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

async function buildCollageCanvas(photoBuffers: Buffer[]): Promise<Buffer> {
  const W = INSTAGRAM_STORY_WIDTH;
  const H = INSTAGRAM_STORY_HEIGHT;
  const buffers = photoBuffers.slice(0, 6);
  if (buffers.length === 0) {
    throw new Error("Kolaj için en az bir görsel gerekli");
  }
  if (buffers.length === 1) {
    return prepareTile(buffers[0]!, W, H);
  }

  const slots = collageSlots(buffers.length, W, H);
  const composites: OverlayOptions[] = [];
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i]!;
    const tile = await prepareTile(buffers[i]!, slot.width, slot.height);
    composites.push({ input: tile, left: slot.left, top: slot.top });
  }

  return sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 4, g: 16, b: 22 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

async function applyStoryBranding(
  photoBuf: Buffer,
  input: {
    logoBuffer: Buffer | null;
    name: string;
    location: string;
    meta: string;
    tagline: string;
    ctaLabel: string;
    accentColor?: string;
  }
): Promise<Buffer> {
  const fonts = resolveStoryFontPair();
  const accent = normalizeHex(input.accentColor);
  const W = INSTAGRAM_STORY_WIDTH;
  const H = INSTAGRAM_STORY_HEIGHT;

  let logoComposite: { input: Buffer; left: number; top: number } | null =
    null;

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
  const displayName = truncateDisplay(input.name, 28);
  const nameFontSize = displayName.length > 22 ? 52 : 64;

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
  <text x="90" y="1572" font-family="StorySansBold" font-size="${nameFontSize}" fill="#ffffff">${escapeXml(displayName)}</text>
  <text x="90" y="1638" font-family="StorySans" font-size="32" fill="#e2e8f0">${escapeXml(truncateDisplay(input.location, 42))}</text>
  <rect x="90" y="1674" rx="22" ry="22" width="620" height="56" fill="#ffffff" fill-opacity="0.16"/>
  <text x="118" y="1712" font-family="StorySans" font-size="26" fill="#ffffff">${escapeXml(truncateDisplay(input.meta, 44))}</text>
  <rect x="90" y="1760" rx="32" ry="32" width="${ctaWidth}" height="72" fill="${accent}"/>
  <text x="132" y="1806" font-family="StorySansBold" font-size="28" fill="#ffffff">${escapeXml(ctaText)}</text>
</svg>`);

  const layers: OverlayOptions[] = [{ input: overlay, left: 0, top: 0 }];
  if (logoComposite) layers.push(logoComposite);

  return sharp(photoBuf)
    .composite(layers)
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

export async function composeInstagramStoryFrame(
  input: InstagramStoryComposeInput
): Promise<Buffer> {
  const photoBuf = await prepareTile(
    input.photoBuffer,
    INSTAGRAM_STORY_WIDTH,
    INSTAGRAM_STORY_HEIGHT
  );
  return applyStoryBranding(photoBuf, input);
}

export async function composeInstagramStoryCollage(
  input: InstagramStoryCollageComposeInput
): Promise<Buffer> {
  const canvas = await buildCollageCanvas(input.photoBuffers);
  return applyStoryBranding(canvas, input);
}
