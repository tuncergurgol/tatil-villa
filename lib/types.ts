export type VillaCategory = "villa" | "apart" | "suit_daire";

export interface Villa {
  id: string;
  slug: string;
  name: string;
  category: VillaCategory;
  region: string;
  regionName?: string;
  regionLabel?: string;
  location: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  pricePerNight: number | null;
  /** Güncel + gelecek dönemlerden gecelik min */
  minNightlyPrice?: number | null;
  /** Güncel + gelecek dönemlerden gecelik max */
  maxNightlyPrice?: number | null;
  /** Tarih seçili aramada konaklama bedeli (seçili gecelerin toplamı) */
  stayTotal?: number | null;
  image: string;
  images: string[];
  description: string;
  amenities: string[];
  featured: boolean;
  popular: boolean;
  deal: boolean;
  recommended: boolean;
}

export interface Region {
  id: string;
  slug: string;
  name: string;
  image: string;
  villaCount: number;
  level?: "IL" | "ILCE" | "MAHALLE";
}

export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  href: string;
}

export interface GuestCounts {
  adults: number;
  children: number;
  babies: number;
  pets: number;
}

export interface HeroSearchRegionOption {
  slug: string;
  name: string;
  label: string;
  level?: "IL" | "ILCE" | "MAHALLE";
}
