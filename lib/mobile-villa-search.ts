export const MOBILE_VILLA_SEARCH_OPEN_EVENT = "mobile-villa-search:open";

export const HEADER_VILLA_SEARCH_INPUT_ID = "header-villa-search-input";
export const HEADER_VILLA_SEARCH_SECTION_ID = "header-villa-search-section";

export function dispatchMobileVillaSearchOpen() {
  window.dispatchEvent(new CustomEvent(MOBILE_VILLA_SEARCH_OPEN_EVENT));
}

/** Üst villa arama kutusuna odaklanır; bulunamazsa false döner. */
export function focusHeaderVillaSearchInput(): boolean {
  const input = document.getElementById(
    HEADER_VILLA_SEARCH_INPUT_ID
  ) as HTMLInputElement | null;

  if (!input) return false;

  const section = document.getElementById(HEADER_VILLA_SEARCH_SECTION_ID);
  section?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  input.focus({ preventScroll: true });
  dispatchMobileVillaSearchOpen();
  return true;
}
