/**
 * Public sitelerin ana sayfa arama sekmelerinde ve
 * "Seyahat Maceranız" kartlarında yayınlanan hizmetler.
 * Acente Siteleri kaydındaki `publishedServices` ile yönetilir.
 */

export type AgencySiteService = {
  key: string;
  label: string;
  /** Villa araması hero formunun kendisi olduğu için kapatılamaz. */
  required?: boolean;
};

export const AGENCY_SITE_SERVICES: AgencySiteService[] = [
  { key: "villa", label: "Villa", required: true },
  { key: "tur", label: "Tur" },
  { key: "otel", label: "Otel" },
  { key: "ucak-otobus", label: "Uçak/Otobüs" },
  { key: "transfer", label: "Transfer" },
  { key: "arac", label: "Araç Kiralama" },
  { key: "gunubirlik", label: "Günübirlik Tur/Aktiviteler" },
  { key: "feribot", label: "Feribot" },
];

export const AGENCY_SITE_SERVICE_KEYS = AGENCY_SITE_SERVICES.map(
  (service) => service.key
);

const REQUIRED_SERVICE_KEYS = AGENCY_SITE_SERVICES.filter(
  (service) => service.required
).map((service) => service.key);

export function isAgencySiteServiceKey(value: string): boolean {
  return AGENCY_SITE_SERVICE_KEYS.includes(value);
}

/** Bilinmeyen anahtarları atar, zorunlu hizmetleri ekler, sırayı korur. */
export function normalizeAgencySiteServices(
  values: readonly string[] | null | undefined
): string[] {
  const selected = new Set(
    (values ?? []).map((value) => value.trim()).filter(isAgencySiteServiceKey)
  );
  for (const key of REQUIRED_SERVICE_KEYS) selected.add(key);
  return AGENCY_SITE_SERVICE_KEYS.filter((key) => selected.has(key));
}
