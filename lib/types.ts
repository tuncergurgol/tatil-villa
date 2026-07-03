export type VillaCategory = "villa" | "apart" | "suit_daire";

export interface Villa {
  id: string;
  slug: string;
  name: string;
  category: VillaCategory;
  region: string;
  regionName?: string;
  location: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  pricePerNight: number | null;
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
