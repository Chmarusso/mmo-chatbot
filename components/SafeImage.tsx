"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

interface SafeImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined;
  fallbackSrc?: string;
}

export default function SafeImage({ src, alt, fallbackSrc = "/mmoplaya-logo.png", ...rest }: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallbackSrc);

  return (
    <Image
      {...rest}
      alt={alt}
      src={currentSrc}
      onError={() => setCurrentSrc(fallbackSrc)}
    />
  );
}
