import { getImageProps } from "next/image";
import { preload } from "react-dom";

export const HERO_LCP_SIZES = "(max-width: 768px) 100vw, 1400px";
export const HERO_LCP_QUALITY = 60;

/** Optimized `/_next/image` LCP preload with fetchpriority=high. */
export function preloadOptimizedLcpImage(
  src: string,
  sizes: string = HERO_LCP_SIZES,
  quality = HERO_LCP_QUALITY
) {
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
