export type AssistantSearchState = {
  guestName?: string;
  /** Ad alındıktan sonra "Nasıl yardımcı olabilirim?" soruldu. */
  helpAsked?: boolean;
  guestPhone?: string;
  guestEmail?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  /** Tek kişi sayısı verildiyse o sayı ve sonraki iki kapasite. */
  partySizes?: number[];
  children?: number;
  regionSlugs?: string[];
  amenityNames?: string[];
  amenitiesCollected?: boolean;
  phoneCollected?: boolean;
  /** Bu sorguda WhatsApp ile gönderilmiş villa id'leri. */
  sentVillaIds?: string[];
  /** "Başka yok mu" ile kaç ek liste gönderildi. En fazla 3. */
  moreOptionRounds?: number;
  /** Kriter içermeyen yeni bir villa talebi; eski arama geçmişten geri yüklenmez. */
  freshIntake?: boolean;
};
