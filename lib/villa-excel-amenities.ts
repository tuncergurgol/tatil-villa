import * as XLSX from "xlsx";

export type ExcelRow = Record<string, unknown>;

/** Excel olanak sütunu -> master Amenity adı */
export const EXCEL_AMENITY_TO_MASTER: Record<string, string> = {
  "Barbebü / Mangal": "Barbekü",
  "Özel park yeri": "Otopark",
  "Site İçerisinde": "Site içerisinde",
  "Ütü / Ütü Masası": "Ütü Masası",
  "Uydu kanalları": "Uydu Yayını",
  "Çamaşır makinesi": "Çamaşır Makinesi",
  "Çay/Kahve makinesi": "Kahve Makinesi",
  "Çaydanlık": "Kettle",
  "Ekmek Kızartma Makinesi": "Tost Makinesi",
  "Kahve makinesi": "Kahve Makinesi",
  "Tabaklar ve mutfak gereçleri": "Mutfak Gereçleri",
  "Tost makinesi": "Tost Makinesi",
  "Yemek masası": "Yemek Masası",
  "Evcil Hayvan İzinli (Pati Dostu)": "Evcil Hayvan İzinli",
  "Tesisimizde 2 kişilik Serpme Kahvaltı ücretsiz olup, Diğer misafirlerimiz için ekstra ücret talep edilmektedir.":
    "Evimizde 2 kişilik ücretsiz kahvaltı hizmeti sunulmaktadır.",
  "Tesisimizde konaklayan misafirlerimiz, tatil süresi boyunca bir kez olmak üzere tesise ait restoranda sunulan sabah kahvaltısından ücretsiz olarak yararlanabilecektir":
    "Evimizde tek seferlik ücretsiz kahvaltı hizmeti sunulmaktadır.",
  "Tesisimizde konaklayan misafirlerimiz, tatil süresince işletmemize ait restoranda sunulan sabah kahvaltılarından ücretsiz olarak yararlanabilecektir.":
    "Evimizde tek seferlik ücretsiz kahvaltı hizmeti sunulmaktadır.",
};

/** Excel olanak sütunu -> master FacilityCategory adı (olanak bölümündeki kategori etiketleri) */
export const EXCEL_AMENITY_TO_FACILITY: Record<string, string> = {
  "Geniş Aileler": "Geniş Aileler ve Gruplar İçin",
  "Infinity (Sonsuzluk) Havuzlu": "Infinity (Sonsuzluk) Havuzlu Villalar",
  "Isıtmalı Havuzlu": "Isıtmalı Havuzlu Villalar",
  "Kapalı Havuzlu": "Kapalı Havuzlu Villalar",
  "Merkezi Konum": "Merkeze Yakın Villalar",
  "Ortak Havuzlu": "Ortak Havuzlu Villalar",
  "Plaja Yakın": "Plaja Yakın Villalar",
  "Sinema Odası Olan": "Sinema Odası Olanlar",
  "Spor Aletleri (GYM) Olan": "Spor Aletleri (GYM) olan villalar",
  "Özel Havuzlu": "Özel Havuzlu Villalar",
  "Deniz Manzarası": "Deniz Manzaralı Villalar",
  Muhafazakar: "Muhafazakar Villalar",
  Bungalov: "Bungalov",
  Balayı: "Balayı Villaları",
  "Çocuk Havuzu": "Çocuk Havuzlu Villalar",
  Jakuzi: "Jakuzili Villalar",
  Saunalı: "Sauna ve Hamamlı Villalar",
  "Türk Hamamı": "Sauna ve Hamamlı Villalar",
};

/** Excel tesis kategorisi sütunu -> master FacilityCategory adı */
export const EXCEL_FACILITY_TO_MASTER: Record<string, string> = {
  "Balayı Villası": "Balayı Villaları",
  "Balayı Villaları": "Balayı Villaları",
  "Exclusive Villalar": "Lüks Villalar",
  "Geniş Aileler ve Gruplar İçin": "Geniş Aileler ve Gruplar İçin",
  "Kiralık Yazlık Apart": "Villa ve Apart",
  "Ortak Havuzlu Villalar": "Ortak Havuzlu Villalar",
  "Plaja Yakın Villalar": "Plaja Yakın Villalar",
  "Saunalı Villalar": "Sauna ve Hamamlı Villalar",
  "Türk Hamamı olan Villalar": "Sauna ve Hamamlı Villalar",
  "Sinema Odası Olanlar": "Sinema Odası Olanlar",
  "Spor Aletleri (GYM) olan villalar": "Spor Aletleri (GYM) olan villalar",
  "Evcil Hayvan İzinli Villalar": "Köpek Kabul Eden Villalar",
  "Oyun Grupları (Masa Tenisi, Bilardo, Langırt) olan Villalar":
    "Eğlence ve Aktivite İmkanlı Villalar",
  "Çocuk Oyun Parkı olan Villalar": "Çocuk Oyun Parkı olan Villalar",
};

/** Villa Öne Çıkan Özellikler Excel sütunu -> Öne Çıkanlar amenity adı */
export const EXCEL_FEATURED_TO_AMENITY: Record<string, string> = {
  "Evcil Hayvan İzinli (Pati Dostu)": "Evcil Hayvan İzinli",
  "Infinity (Sonsuzluk) Havuzlu": "Infinity Havuz",
  "Isıtmalı Havuzlu": "Isıtmalı Havuz",
  "Kapalı Havuzlu": "Kapalı Havuz",
  "Merkezi Konum": "Merkeze Yakın",
  "Oyun Grupları":
    "Oyun Grupları (Masa Tenisi, Bilardo, Langırt) olan Villalar",
  "Plaja Yakın": "Denize Yakın",
  "Sinema Odası Olan": "Sinema Odası Olanlar",
};

/** Öne çıkan özellikler Excel'inde atlanan sütunlar (başka kategori / DB'de yok) */
export const EXCEL_FEATURED_SKIP = new Set([
  "Çocuk Oyun Grupları",
  "Etkinlik Yapılabilir",
  "Geniş Aileler",
  "Ortak Havuzlu",
  "Spor Aletleri (GYM) Olan",
  "Yemek Hizmeti",
  "Yerden Isıtma",
]);

/** Bu Excel sütunları atlanır (master tabloda karşılığı yok / tekrar eden) */
export const EXCEL_AMENITY_SKIP = new Set([
  "Özel banyo",
  "Tuvalet",
  "Bebek yatağı",
  "Elektrik Süpürgesi",
  "Jeneratör",
  "Müstakil Bahçeli",
  "Su Deposu",
  "Şezlonglar ve şemsiyeler",
  "Güneş Enerji Sistemi",
  "Davlumbaz",
  "Çocuk Oyun Grupları",
  "Etkinlik Yapılabilir",
  "Oyun Grupları",
  "Yemek Hizmeti",
  "Tesise ait restoranda kahvaltı, öğle ve akşam yemekleri ile ara aperatif hizmetlerinden indirimli olarak yararlanabilirsiniz. Dilerseniz, kahvaltı ve yemek hazırlığıyla uğraşmadan siparişleriniz villanıza teslim edilir.",
]);

export const EXCEL_FACILITY_SKIP = new Set<string>();

export type VillaExcelAmenitySets = {
  amenities: string[];
  facilityCategories: string[];
  unmappedAmenityColumns: string[];
  unmappedFacilityColumns: string[];
};

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBool(value: unknown): boolean {
  const text = cleanText(value).toLocaleLowerCase("tr-TR");
  return text === "evet" || text === "true" || text === "1";
}

function normalizeKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findByNormalizedName(name: string, masterNames: Set<string>): string | null {
  if (masterNames.has(name)) return name;
  const key = normalizeKey(name);
  for (const master of masterNames) {
    if (normalizeKey(master) === key) return master;
  }
  return null;
}

function mapAmenityColumn(
  column: string,
  masterAmenities: Set<string>
): { amenity?: string; facility?: string; unmapped?: string } {
  if (EXCEL_AMENITY_SKIP.has(column)) return {};

  const facilityRedirect = EXCEL_AMENITY_TO_FACILITY[column];
  if (facilityRedirect) return { facility: facilityRedirect };

  const alias = EXCEL_AMENITY_TO_MASTER[column];
  if (alias) {
    const resolved = findByNormalizedName(alias, masterAmenities);
    if (resolved) return { amenity: resolved };
    return { unmapped: column };
  }

  const direct = findByNormalizedName(column, masterAmenities);
  if (direct) return { amenity: direct };

  const yemekMatch = [...masterAmenities].find((name) => {
    if (!name.startsWith("Tesisimizde") && !name.startsWith("Evimizde")) return false;
    return (
      normalizeKey(name).includes(normalizeKey(column).slice(0, 40)) ||
      normalizeKey(column).includes(normalizeKey(name).slice(0, 40))
    );
  });
  if (yemekMatch) return { amenity: yemekMatch };

  return { unmapped: column };
}

function mapFacilityColumn(
  column: string,
  masterFacilities: Set<string>
): { facility?: string; unmapped?: string } {
  if (EXCEL_FACILITY_SKIP.has(column)) return {};

  const alias = EXCEL_FACILITY_TO_MASTER[column];
  if (alias) {
    const resolved = findByNormalizedName(alias, masterFacilities);
    if (resolved) return { facility: resolved };
    return { facility: alias };
  }

  const direct = findByNormalizedName(column, masterFacilities);
  if (direct) return { facility: direct };

  return { unmapped: column };
}

export function getExcelAmenityColumnBounds(headers: string[]) {
  const amenityStartIndex = headers.findIndex((h) => h === "Banyo veya duş");
  const facilityStartIndex = headers.findIndex((h) => h === "Balayı Villası");
  return {
    amenityStartIndex,
    facilityStartIndex,
    amenityColumns:
      amenityStartIndex >= 0 && facilityStartIndex > amenityStartIndex
        ? headers.slice(amenityStartIndex, facilityStartIndex)
        : [],
    facilityColumns:
      facilityStartIndex >= 0 ? headers.slice(facilityStartIndex) : [],
  };
}

export function resolveVillaAmenitiesFromExcelRow(
  row: ExcelRow,
  headers: string[],
  masterAmenityNames: Set<string>,
  masterFacilityNames: Set<string>
): VillaExcelAmenitySets {
  const { amenityColumns, facilityColumns } =
    getExcelAmenityColumnBounds(headers);
  const amenities = new Set<string>();
  const facilityCategories = new Set<string>();
  const unmappedAmenityColumns: string[] = [];
  const unmappedFacilityColumns: string[] = [];

  for (const column of amenityColumns) {
    if (!parseBool(row[column])) continue;
    const mapped = mapAmenityColumn(column, masterAmenityNames);
    if (mapped.amenity) amenities.add(mapped.amenity);
    if (mapped.facility) facilityCategories.add(mapped.facility);
    if (mapped.unmapped) unmappedAmenityColumns.push(mapped.unmapped);
  }

  for (const column of facilityColumns) {
    if (!parseBool(row[column])) continue;
    const mapped = mapFacilityColumn(column, masterFacilityNames);
    if (mapped.facility) facilityCategories.add(mapped.facility);
    if (mapped.unmapped) unmappedFacilityColumns.push(mapped.unmapped);
  }

  return {
    amenities: [...amenities],
    facilityCategories: [...facilityCategories],
    unmappedAmenityColumns,
    unmappedFacilityColumns,
  };
}

export function readTesislerSheet(excelPath: string) {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames.includes("Tesisler")
    ? "Tesisler"
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const headers = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    range: 0,
  })[0];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: "" });
  return { sheetName, headers, rows };
}
