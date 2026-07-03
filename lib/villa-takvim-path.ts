export function villaTakvimPath(villaId?: string): string {
  if (!villaId) return "/admin/konaklama/takvim";
  return `/admin/konaklama/takvim?villa=${villaId}`;
}
