export type AssistantSearchState = {
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  regionSlugs?: string[];
  amenityNames?: string[];
  amenitiesCollected?: boolean;
};
