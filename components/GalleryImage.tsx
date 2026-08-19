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

export default function GalleryImage({
  src,
  unoptimized,
  loading,
  fetchPriority,
  quality,
  ...props
}: GalleryImageProps) {
  const skipOptimizer = unoptimized === true;
  const isPriority = props.priority === true;

  return (
    <Image
      src={resolveGallerySrc(src, skipOptimizer)}
      unoptimized={skipOptimizer}
      quality={quality ?? 70}
      loading={loading ?? (isPriority ? "eager" : "lazy")}
      fetchPriority={fetchPriority ?? (isPriority ? "high" : "auto")}
      {...props}
    />
  );
}
