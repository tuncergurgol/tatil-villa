import { getImageProps } from "next/image";
import { preload } from "react-dom";

/** Optimized `/_next/image` LCP preload with fetchpriority=high. */
export function preloadOptimizedLcpImage(
  src: string,
  sizes: string,
  quality = 70
) {
  const { props } = getImageProps({
    src,
    alt: "",
    fill: true,
    sizes,
    quality,
  });

  if (!props.src) return;

  preload(props.src, {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: props.srcSet,
    imageSizes: props.sizes,
  });
}
