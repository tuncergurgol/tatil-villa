import { RegionLevel } from "@prisma/client";

export type RegionSeed = {
  slug: string;
  name: string;
  level: RegionLevel;
  image: string;
  parentSlug?: string;
  showOnHome?: boolean;
  showInSearch?: boolean;
  sortOrder?: number;
};

type RegionTreeNode = {
  slug: string;
  name: string;
  image?: string;
  showOnHome?: boolean;
  showInSearch?: boolean;
  children?: RegionTreeNode[];
};

const DEFAULT_IMAGES = {
  il: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  ilce: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
  mahalle: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80",
};

const REGION_TREE: RegionTreeNode[] = [
  { slug: "afyon", name: "Afyon", showInSearch: true },
  {
    slug: "sakarya",
    name: "Sakarya",
    showInSearch: true,
    children: [
      { slug: "adapazari", name: "Adapazarı", showInSearch: true },
      { slug: "sapanca", name: "Sapanca", showInSearch: true, showOnHome: true },
    ],
  },
  {
    slug: "antalya",
    name: "Antalya",
    showInSearch: true,
    children: [
      { slug: "alanya", name: "Alanya", showInSearch: true, showOnHome: true },
      { slug: "belek", name: "Belek", showInSearch: true, showOnHome: true },
      { slug: "demre", name: "Demre", showInSearch: true },
      {
        slug: "kalkan",
        name: "Kalkan",
        showInSearch: true,
        showOnHome: true,
        children: [
          { slug: "kalkan-merkez", name: "Kalkan Merkez" },
          { slug: "islamar", name: "İslamlar" },
          { slug: "uzumlu", name: "Üzümlü" },
          { slug: "patara", name: "Patara" },
          { slug: "yesilkoy", name: "Yeşilköy" },
          { slug: "akbel", name: "Akbel" },
        ],
      },
      {
        slug: "kas",
        name: "Kaş",
        showInSearch: true,
        showOnHome: true,
        children: [
          { slug: "cukurbag", name: "Çukurbağ" },
          { slug: "yarimada", name: "Yarımada" },
          { slug: "bayindir", name: "Bayındır" },
        ],
      },
      { slug: "kemer", name: "Kemer", showInSearch: true, showOnHome: true },
      { slug: "lara", name: "Lara", showInSearch: true },
    ],
  },
  {
    slug: "aydin",
    name: "Aydın",
    showInSearch: true,
    children: [
      { slug: "kusadasi", name: "Kuşadası", showInSearch: true, showOnHome: true },
      { slug: "didim", name: "Didim", showInSearch: true, showOnHome: true },
    ],
  },
  { slug: "bolu", name: "Bolu", showInSearch: true },
  { slug: "bursa", name: "Bursa", showInSearch: true },
  {
    slug: "izmir",
    name: "İzmir",
    showInSearch: true,
    children: [
      {
        slug: "cesme",
        name: "Çeşme",
        showInSearch: true,
        showOnHome: true,
        children: [{ slug: "alacati", name: "Alaçatı", showOnHome: true }],
      },
    ],
  },
  {
    slug: "mugla",
    name: "Muğla",
    showInSearch: true,
    children: [
      {
        slug: "bodrum",
        name: "Bodrum",
        showInSearch: true,
        showOnHome: true,
        children: [
          { slug: "bitez", name: "Bitez" },
          { slug: "yalikavak", name: "Yalıkavak" },
          { slug: "turgutreis", name: "Turgutreis" },
          { slug: "gundogan", name: "Gündoğan" },
          { slug: "adabuku", name: "Adabükü" },
        ],
      },
      { slug: "dalyan", name: "Dalyan", showInSearch: true, showOnHome: true },
      {
        slug: "fethiye",
        name: "Fethiye",
        showInSearch: true,
        showOnHome: true,
        children: [
          { slug: "fethiye-merkez", name: "Fethiye Merkez" },
          { slug: "fethiye-merkeze-yakin", name: "Fethiye Merkeze Yakın" },
          { slug: "oludeniz", name: "Ölüdeniz", showOnHome: true },
          { slug: "kayakoy", name: "Kayaköy", showOnHome: true },
          { slug: "faralya", name: "Faralya" },
          { slug: "yesil-uzumlu", name: "Yeşil Üzümlü" },
          { slug: "gocek", name: "Göcek", showOnHome: true },
        ],
      },
      {
        slug: "seydikemer",
        name: "Seydikemer",
        showInSearch: true,
        children: [{ slug: "yakakoy", name: "Yakaköy" }],
      },
      { slug: "gokova", name: "Gökova", showInSearch: true },
      { slug: "koycegiz", name: "Köyceğiz", showInSearch: true },
      {
        slug: "marmaris",
        name: "Marmaris",
        showInSearch: true,
        showOnHome: true,
        children: [
          { slug: "orhaniye", name: "Orhaniye" },
          { slug: "sogut", name: "Söğüt" },
          { slug: "selimiye", name: "Selimiye", showOnHome: true },
        ],
      },
      { slug: "dalaman", name: "Dalaman", showInSearch: true },
    ],
  },
  {
    slug: "rize",
    name: "Rize",
    showInSearch: true,
    children: [{ slug: "camlihemsin", name: "Çamlıhemşin", showInSearch: true }],
  },
  {
    slug: "yalova",
    name: "Yalova",
    showInSearch: true,
    children: [{ slug: "yalova-merkez", name: "Yalova Merkez", showInSearch: true }],
  },
];

function flattenTree(
  nodes: RegionTreeNode[],
  level: RegionLevel,
  parentSlug?: string
): RegionSeed[] {
  const result: RegionSeed[] = [];

  nodes.forEach((node, index) => {
    const image =
      node.image ??
      (level === RegionLevel.IL
        ? DEFAULT_IMAGES.il
        : level === RegionLevel.ILCE
          ? DEFAULT_IMAGES.ilce
          : DEFAULT_IMAGES.mahalle);

    result.push({
      slug: node.slug,
      name: node.name,
      level,
      image,
      parentSlug,
      showOnHome: node.showOnHome,
      showInSearch: node.showInSearch ?? level !== RegionLevel.MAHALLE,
      sortOrder: index + 1,
    });

    if (node.children?.length) {
      const childLevel =
        level === RegionLevel.IL
          ? RegionLevel.ILCE
          : level === RegionLevel.ILCE
            ? RegionLevel.MAHALLE
            : RegionLevel.MAHALLE;

      result.push(...flattenTree(node.children, childLevel, node.slug));
    }
  });

  return result;
}

export const TURKEY_REGIONS: RegionSeed[] = flattenTree(
  REGION_TREE,
  RegionLevel.IL
);
