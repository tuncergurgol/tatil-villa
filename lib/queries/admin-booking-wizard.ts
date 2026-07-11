import { prisma } from "@/lib/db";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";
import {
  resolveVillaStayQuote,
  type VillaStayQuoteResult,
} from "@/lib/queries/villa-stay-quote";

export type AdminBookingWizardVilla = {
  id: string;
  name: string;
  image: string;
  location: string;
  regionName: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  active: boolean;
};

export type AdminBookingWizardQuote = VillaStayQuoteResult;

export async function getAdminBookingWizardVillas(): Promise<
  AdminBookingWizardVilla[]
> {
  const villas = await prisma.villa.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      image: true,
      images: true,
      location: true,
      guests: true,
      bedrooms: true,
      bathrooms: true,
      active: true,
      region: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return villas.map((villa) => ({
    id: villa.id,
    name: villa.name,
    image: getVillaShowcaseImage(villa),
    location: villa.location,
    regionName: villa.region.name,
    guests: villa.guests,
    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    active: villa.active,
  }));
}

export async function resolveAdminBookingWizardQuote(
  villaId: string,
  checkIn: string,
  checkOut: string
): Promise<AdminBookingWizardQuote | null> {
  return resolveVillaStayQuote(villaId, checkIn, checkOut);
}
