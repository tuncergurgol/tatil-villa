export const INSTAGRAM_STORY_WIDTH = 1080;
export const INSTAGRAM_STORY_HEIGHT = 1920;

export const INSTAGRAM_STORY_TAGLINES = [
  "KİRALIK VILLA",
  "HUZURLU KAÇAMAĞINIZ",
  "BALAYI VE ÇİFT KAÇAMAĞI",
  "AİLE TATİLİ",
  "MANZARALI TATİL",
  "GECE IŞIKLARI",
  "ÖZEL HAVUZLU VILLA",
] as const;

export type InstagramStoryComposeInput = {
  photoBuffer: Buffer;
  logoBuffer: Buffer | null;
  name: string;
  location: string;
  meta: string;
  tagline: string;
  ctaLabel: string;
  accentColor?: string;
};

export type InstagramStorySlideResult = {
  index: number;
  fileName: string;
  mimeType: "image/jpeg";
  base64: string;
  byteLength: number;
};

export type InstagramStoryVillaPayload = {
  id: string;
  slug: string;
  name: string;
  location: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  images: string[];
  defaultMeta: string;
  defaultTagline: string;
  defaultCta: string;
  logoUrl: string;
  accentColor: string;
};

export type InstagramStorySiteOption = {
  key: "tatildeyiz" | "balayi-villacisi" | "tatil-villacisi";
  label: string;
  domain: string;
  logoUrl: string;
  accentColor: string;
  ctaLabel: string;
};
