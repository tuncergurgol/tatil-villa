/** Public villa detail path: /villa-sidera (not /villalar/villa-sidera). */
export function villaPublicPath(slug: string): string {
  const cleaned = slug.trim().replace(/^\/+/, "");
  return cleaned ? `/${cleaned}` : "/villalar";
}

export function villaPublicUrl(origin: string, slug: string): string {
  const base = origin.replace(/\/+$/g, "");
  return `${base}${villaPublicPath(slug)}`;
}
