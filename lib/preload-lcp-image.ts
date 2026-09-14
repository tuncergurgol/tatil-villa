import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { encodeGalleryImageUrl } from "@/lib/encode-gallery-image-url";

export const HERO_LCP_SIZES = "(max-width: 640px) 640px, (max-width: 828px) 828px, 1400px";
export const HERO_LCP_QUALITY = 60;

/** Prefer the mobile candidate so preload does not fetch a 1400w hero on phones. */
export function pickSrcSetCandidate(
  srcSet: string | undefined,
  width: number
): string | undefined {
  if (!srcSet) return undefined;
  const wanted = `${width}w`;
  for (const part of srcSet.split(",")) {
    const [url, descriptor] = part.trim().split(/\s+/);
    if (url && descriptor === wanted) return url;
  }
  return undefined;
}

/** Optimized `/_next/image` LCP preload with fetchpriority=high. */
export function preloadOptimizedLcpImage(
  src: string,
  sizes: string = HERO_LCP_SIZES,
  quality = HERO_LCP_QUALITY
) {
  // Gallery WebP is already compressed; `/_next/image` returns 400
  // ("isn't a valid image") and can crash the villa page.
  if (src.startsWith("/uploads/")) {
    preload(encodeGalleryImageUrl(src), {
      as: "image",
      fetchPriority: "high",
    });
    return;
  }

  const { props } = getImageProps({
    src,
    alt: "",
    fill: true,
    sizes,
    quality,
  });

  if (!props.src) return;

  // Same-origin `/_next/image` already gets a preload from next/image `priority`.
  // react-dom preload() also emits `<link rel="preconnect" href="/">`, which
  // PageSpeed flags as unused because the document is already on this origin.
  if (props.src.startsWith("/")) return;

  preload(props.src, {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: props.srcSet,
    imageSizes: props.sizes,
  });
}
