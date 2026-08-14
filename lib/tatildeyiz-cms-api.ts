const API_BASE = "https://api.tatildeyiz.com.tr/public";

const FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent": "TatilVillaImport/1.0",
};

type ApiEnvelope<T> = {
  success: boolean;
  status?: number;
  content: T;
};

export type TatildeyizBlogCategory = {
  id: number;
  name: string;
  value: string;
};

export type TatildeyizBlogPost = {
  id: number;
  imgSrc: string;
  slug: string;
  explain: string;
  published: boolean;
  tag?: string | null;
  priority?: number;
  seoTitle?: string;
  seoDesc?: string;
  seoKeywords?: string;
  sefUrl?: string;
  title: string;
  createdAt?: string;
  postCategoryId?: number | null;
};

export type TatildeyizCampaign = {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  type: "slider" | "box" | string;
  order: number;
};

export type TatildeyizCampaignList = {
  sliderCampaigns: TatildeyizCampaign[];
  boxCampaigns: TatildeyizCampaign[];
};

async function fetchPublicApi<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}/${path}`, {
    headers: FETCH_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API hatası (${response.status}): ${path}`);
  }

  const json = (await response.json()) as ApiEnvelope<T>;
  if (!json.success) {
    throw new Error(`API başarısız: ${path}`);
  }

  return json.content;
}

export async function fetchTatildeyizBlogCategories() {
  return fetchPublicApi<TatildeyizBlogCategory[]>("blogCategoryList");
}

export async function fetchTatildeyizBlogPosts() {
  return fetchPublicApi<TatildeyizBlogPost[]>("blogPostList");
}

export async function fetchTatildeyizCampaigns() {
  return fetchPublicApi<TatildeyizCampaignList>("campaignList");
}

export function mapTatildeyizCampaignHref(linkUrl: string) {
  const normalized = linkUrl.trim();
  if (!normalized) return "/villalar";
  if (normalized.startsWith("http")) return normalized;

  const map: Record<string, string> = {
    "/tesis/liste": "/villalar",
    "/tesis/list": "/villalar",
    "/turlar": "/#kampanyalar",
    "/tekneler": "/#kampanyalar",
    "/transfer": "/kurumsal/iletisim",
  };

  return map[normalized] ?? normalized;
}

export function htmlToExcerpt(html: string, maxLength = 220) {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}
