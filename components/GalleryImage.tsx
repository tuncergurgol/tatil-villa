import Image, { type ImageProps } from "next/image";
import { encodeGalleryImageUrl } from "@/lib/encode-gallery-image-url";

type GalleryImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

/** Yerel /uploads görselleri zaten WebP (~100KB); nginx üzerinden doğrudan sunulur.
 *  Next `/_next/image` optimizer dosyayı bulamadığı için 400 veriyor ve sayfayı yavaşlatıyor.
 */
function shouldSkipImageOptimizer(src: string) {
  return src.startsWith("/uploads/");
}

export default function GalleryImage({
  src,
  unoptimized,
  loading,
  fetchPriority,
  ...props
}: GalleryImageProps) {
  const encoded = encodeGalleryImageUrl(src);
  const skipOptimizer = unoptimized || shouldSkipImageOptimizer(encoded);
  const isPriority = props.priority === true;

  return (
    <Image
      src={encoded}
      unoptimized={skipOptimizer}
      loading={loading ?? (isPriority ? "eager" : "lazy")}
      fetchPriority={fetchPriority ?? (isPriority ? "high" : "auto")}
      {...props}
    />
  );
}
