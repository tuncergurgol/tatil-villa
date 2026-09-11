import Image, { type ImageProps } from "next/image";
import { encodeGalleryImageUrl } from "@/lib/encode-gallery-image-url";

type GalleryImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

function resolveGallerySrc(src: string, skipOptimizer: boolean) {
  if (!src.startsWith("/uploads/")) return src;
  if (skipOptimizer) return encodeGalleryImageUrl(src);
  try {
    return decodeURI(src.split("?")[0] ?? src);
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
      src={resolveGallerySrc(src, skipOptimizer)}
      unoptimized={skipOptimizer}
      quality={quality ?? 70}
      loading={loading ?? (isPriority ? "eager" : "lazy")}
      fetchPriority={fetchPriority ?? (isPriority ? "high" : "auto")}
    />
  );
}
