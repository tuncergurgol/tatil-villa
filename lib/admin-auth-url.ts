/** Admin paneli public URL (şifre sıfırlama linki vb.) */
export function getAdminPanelBaseUrl(): string {
  const host =
    process.env.ADMIN_HOST?.split(",")[0]?.trim() ||
    "bont.tatildeyiz.com.tr";
  return `https://${host.replace(/^https?:\/\//i, "").split("/")[0]}`;
}
