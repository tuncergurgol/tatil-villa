export const INSTAGRAM_STORY_WIDTH = 1080;
export const INSTAGRAM_STORY_HEIGHT = 1920;

export const INSTAGRAM_STORY_MODES = ["villa", "category", "region"] as const;
export type InstagramStoryMode = (typeof INSTAGRAM_STORY_MODES)[number];

export const INSTAGRAM_STORY_TAGLINES = [
  "KİRALIK VILLA",
  "HUZURLU KAÇAMAĞINIZ",
  "BALAYI VE ÇİFT KAÇAMAĞI",
  "AİLE TATİLİ",
  "MANZARALI TATİL",
  "GECE IŞIKLARI",
  "ÖZEL HAVUZLU VILLA",
  "KATEGORİ SEÇKİSİ",
  "BÖLGE SEÇKİSİ",
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

export type InstagramStoryCollageComposeInput = {
  photoBuffers: Buffer[];
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

export type InstagramStoryImageItem = {
  url: string;
  villaId: string;
  villaName: string;
};

export type InstagramStoryVillaPayload = {
  mode: "villa";
  id: string;
  slug: string;
  name: string;
  location: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  images: string[];
  imageItems: InstagramStoryImageItem[];
  defaultMeta: string;
  defaultTagline: string;
  defaultCta: string;
  logoUrl: string;
  accentColor: string;
  villaCount: number;
};

export type InstagramStoryCollectionPayload = {
  mode: "category" | "region";
  id: string;
  slug: string;
  name: string;
  location: string;
  images: string[];
  imageItems: InstagramStoryImageItem[];
  defaultMeta: string;
  defaultTagline: string;
  defaultCta: string;
  logoUrl: string;
  accentColor: string;
  villaCount: number;
};

export type InstagramStorySourcePayload =
  | InstagramStoryVillaPayload
  | InstagramStoryCollectionPayload;

export type InstagramStorySiteOption = {
  key: string;
  label: string;
  domain: string;
  logoUrl: string;
  accentColor: string;
  ctaLabel: string;
};

export type InstagramStorySearchHit = {
  id: string;
  name: string;
  slug: string;
  image: string;
  location: string;
  guests?: number;
  bedrooms?: number;
  villaCount?: number;
  level?: string;
};
