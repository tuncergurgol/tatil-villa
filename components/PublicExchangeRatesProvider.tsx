"use client";

import { createContext, useContext } from "react";
import type { PublicExchangeRates } from "@/lib/currency-conversion";

const PublicExchangeRatesContext = createContext<PublicExchangeRates | null>(
  null
);

export function PublicExchangeRatesProvider({
  value,
  children,
}: {
  value: PublicExchangeRates | null;
  children: React.ReactNode;
}) {
  return (
    <PublicExchangeRatesContext.Provider value={value}>
      {children}
    </PublicExchangeRatesContext.Provider>
  );
}

export function usePublicExchangeRates(): PublicExchangeRates | null {
  return useContext(PublicExchangeRatesContext);
}
