import Image, { type ImageProps } from "next/image";
import { encodeGalleryImageUrl } from "@/lib/encode-gallery-image-url";

type GalleryImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

export default function GalleryImage({ src, ...props }: GalleryImageProps) {
  return <Image src={encodeGalleryImageUrl(src)} {...props} />;
}
