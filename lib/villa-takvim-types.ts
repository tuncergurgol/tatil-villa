import type { VillaPeriodCurrency } from "@prisma/client";

export type VillaTakvimSearchItem = {
  id: string;
  villaId: number | null;
  slug: string;
  name: string;
  originalName: string;
  documentNo: string;
  image: string;
  active: boolean;
  periodCount: number;
  displayPrice: number | null;
  displayPriceCurrency: VillaPeriodCurrency;
  minFuturePrice: number | null;
  maxFuturePrice: number | null;
};
