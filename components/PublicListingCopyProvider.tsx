"use client";

import { createContext, useContext } from "react";
import {
  getPublicListingCopy,
  rewriteVillaWordingToTesis,
  type PublicListingCopy,
} from "@/lib/public-listing-copy";

const PublicListingCopyContext = createContext<PublicListingCopy>(
  getPublicListingCopy(null)
);

export function PublicListingCopyProvider({
  value,
  children,
}: {
  value: PublicListingCopy;
  children: React.ReactNode;
}) {
  return (
    <PublicListingCopyContext.Provider value={value}>
      {children}
    </PublicListingCopyContext.Provider>
  );
}

export function usePublicListingCopy(): PublicListingCopy {
  return useContext(PublicListingCopyContext);
}

export function ListingPhrase({
  villa,
  tesis,
}: {
  villa: string;
  tesis: string;
}) {
  const copy = usePublicListingCopy();
  return <>{copy.usesTesis ? tesis : villa}</>;
}

export function ListingWording({ children }: { children: string }) {
  const copy = usePublicListingCopy();
  return <>{copy.usesTesis ? rewriteVillaWordingToTesis(children) : children}</>;
}
