export type AssistantSearchState = {
  guestName?: string;
  /** Ad alındıktan sonra "Nasıl yardımcı olabilirim?" soruldu. */
  helpAsked?: boolean;
  guestPhone?: string;
  guestEmail?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  babies?: number;
  /** "Kaç kişilik" cevabı. Kapasite, yetişkin ve çocuk sayısı netleşince hesaplanır. */
  provisionalGuests?: number;
  /** Yetişkin, çocuk ve bebek sayısı alındı. */
  countsCollected?: boolean;
  /** Aile, arkadaş grubu veya farketmez. */
  partyKind?: "family" | "friends" | "any";
  /** Kişi sayısı sorusuna "farketmez" denildi; kapasite filtresi yok. */
  guestsAny?: boolean;
  /** Kapasite ve bir üst kapasite. Birden fazla sayı yazıldıysa yalnızca onlar. */
  partySizes?: number[];
  regionSlugs?: string[];
  /** Seçilen yerin il, ilçe ve mahalle zinciri. */
  regionTrail?: {
    il?: { name: string; slug: string };
    ilce?: { name: string; slug: string };
    mahalle?: { name: string; slug: string };
  };
  /** Bölge sorusuna "farketmez" denildi; tüm bölgeler aranır. */
  regionAny?: boolean;
  amenityNames?: string[];
  amenitiesCollected?: boolean;
  phoneCollected?: boolean;
  /** Bu sorguda WhatsApp ile gönderilmiş villa id'leri. */
  sentVillaIds?: string[];
  /** "Başka yok mu" ile kaç ek liste gönderildi. En fazla 3. */
  moreOptionRounds?: number;
  /** Kriter içermeyen yeni bir villa talebi; eski arama geçmişten geri yüklenmez. */
  freshIntake?: boolean;
  /** "Ocak başı" gibi yaklaşık bir dönemden sonra net tarih soruldu. */
  askedNetDates?: boolean;
};
