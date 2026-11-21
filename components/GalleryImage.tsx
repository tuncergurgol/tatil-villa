import Image, { type ImageProps } from "next/image";
import { encodeGalleryImageUrl } from "@/lib/encode-gallery-image-url";

type GalleryImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

function cardImageWidth(width: ImageProps["width"]): number | null {
  const value = typeof width === "number" ? width : Number(width);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 500) return 560;
  if (value >= 360) return 384;
  return 280;
}

function resolveGallerySrc(
  src: string,
  skipOptimizer: boolean,
  width: ImageProps["width"],
  priority: boolean
) {
  if (!src.startsWith("/uploads/")) return src;
  const clean = src.split("?")[0] ?? src;
  const cardWidth = cardImageWidth(width);
  if (skipOptimizer && !priority && cardWidth && !clean.endsWith(".svg")) {
    return `/api/media-card?src=${encodeURIComponent(clean)}&w=${cardWidth}`;
  }
  if (skipOptimizer) return encodeGalleryImageUrl(src);
  try {
    return decodeURI(clean);
  } catch {
    return src;
  }
}

function shouldSkipOptimizer(src: string, unoptimized?: boolean) {
  if (unoptimized === true) return true;
  // Upload pipeline already writes ~100KB WebP. Next `/_next/image` re-encodes
  // every srcset width and returns 400 ("isn't a valid image") on new villas.
  return src.startsWith("/uploads/");
}

export default function GalleryImage({
  src,
  unoptimized,
  loading,
  fetchPriority,
  quality,
  priority,
  ...props
}: GalleryImageProps) {
  const skipOptimizer = shouldSkipOptimizer(src, unoptimized);
  const isPriority = priority === true;

  return (
    <Image
      {...props}
      src={resolveGallerySrc(src, skipOptimizer, props.width, isPriority)}
      unoptimized={skipOptimizer}
      quality={quality ?? 70}
      loading={loading ?? (isPriority ? "eager" : "lazy")}
      fetchPriority={fetchPriority ?? (isPriority ? "high" : "auto")}
    />
  );
}
