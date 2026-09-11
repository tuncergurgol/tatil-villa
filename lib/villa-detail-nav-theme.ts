import type { PublicSiteKey } from "@/lib/public-site-keys";

export type VillaDetailNavTheme = {
  bar: string;
  activeText: string;
  inactiveText: string;
  activeIndicator: string;
};

export function getVillaDetailNavTheme(siteKey: PublicSiteKey): VillaDetailNavTheme {
  switch (siteKey) {
    case "tatildeyiz":
      return {
        bar: "bg-red-700",
        activeText: "text-white",
        inactiveText: "text-red-100",
        activeIndicator: "bg-amber-400",
      };
    case "tatil-villacisi":
      return {
        bar: "bg-slate-900",
        activeText: "text-orange-400",
        inactiveText: "text-white/85",
        activeIndicator: "bg-orange-400",
      };
    case "balayi-villacisi":
      return {
        bar: "bg-amber-500",
        activeText: "text-white",
        inactiveText: "text-amber-50/90",
        activeIndicator: "bg-white",
      };
  }
}
