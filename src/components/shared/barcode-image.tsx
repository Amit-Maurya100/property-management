"use client";

import { useMemo, useState } from "react";
import { getBarcodeImageDisplayUrl } from "@/lib/images/resolve-image-url";

type BarcodeImageProps = {
  src: string;
  alt: string;
  className?: string;
};

export function BarcodeImage({ src, alt, className }: BarcodeImageProps) {
  const displaySrc = useMemo(() => getBarcodeImageDisplayUrl(src), [src]);
  const [failed, setFailed] = useState(false);

  if (!displaySrc || failed) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
        Could not load barcode image. If using Google Drive, share the file as{" "}
        <span className="font-medium">Anyone with the link</span> and paste the share URL.
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
