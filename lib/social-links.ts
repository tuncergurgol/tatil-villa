export type SocialLinkKind = "instagram" | "facebook" | "x" | "youtube";

export type SocialLink = {
  href: string;
  label: string;
  kind: SocialLinkKind;
};

export function socialHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("@")) return `https://instagram.com/${value.slice(1)}`;
  return value;
}

export function buildCompanySocialLinks(input: {
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  youtube?: string | null;
}): SocialLink[] {
  return [
    {
      href: socialHref(input.instagram ?? ""),
      label: "Instagram",
      kind: "instagram",
    },
    {
      href: socialHref(input.facebook ?? ""),
      label: "Facebook",
      kind: "facebook",
    },
    {
      href: socialHref(input.twitter ?? ""),
      label: "X",
      kind: "x",
    },
    {
      href: socialHref(input.youtube ?? ""),
      label: "YouTube",
      kind: "youtube",
    },
  ].filter((item): item is SocialLink => Boolean(item.href));
}
