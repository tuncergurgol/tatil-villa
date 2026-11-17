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
  phoneCollected?: boolean;
  /** Bu sorguda WhatsApp ile gönderilmiş villa id'leri. */
  sentVillaIds?: string[];
  /** "Başka yok mu" ile kaç ek liste gönderildi. En fazla 3. */
  moreOptionRounds?: number;
};
