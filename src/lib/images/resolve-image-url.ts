function extractGoogleDriveFileId(url: string): string | null {
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/,
    /drive\.usercontent\.google\.com\/download\?id=([a-zA-Z0-9_-]+)/,
    /googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function isGoogleHostedImageUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return (
      host === "drive.google.com" ||
      host === "drive.usercontent.google.com" ||
      host.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

/** Public CDN URL — works in browsers (unlike drive.usercontent.google.com). */
function toGoogleDriveCdnImageUrl(fileId: string) {
  return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
}

/** Ordered fetch candidates for a Google Drive file. */
export function getGoogleDriveImageCandidates(sourceUrl: string): string[] {
  const driveId = extractGoogleDriveFileId(sourceUrl);
  if (!driveId) {
    const resolved = resolveImageUrl(sourceUrl);
    return resolved ? [resolved] : [];
  }

  return [
    toGoogleDriveCdnImageUrl(driveId),
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`,
    `https://drive.usercontent.google.com/download?id=${driveId}&export=view`,
  ];
}

/** Converts share links (e.g. Google Drive) into URLs suitable for <img src>. */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;

  const trimmed = url.trim();
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return toGoogleDriveCdnImageUrl(driveId);
  }

  return trimmed;
}

export function shouldProxyBarcodeUrl(url: string | null | undefined) {
  if (!url?.trim()) return false;
  return isGoogleHostedImageUrl(url.trim()) || extractGoogleDriveFileId(url.trim()) !== null;
}

export function getBarcodeImageDisplayUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();

  if (shouldProxyBarcodeUrl(trimmed)) {
    return `/api/barcode-image?url=${encodeURIComponent(trimmed)}`;
  }

  return resolveImageUrl(trimmed);
}

export function isAllowedBarcodeProxySource(url: string) {
  if (!url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;
    return isGoogleHostedImageUrl(url) || extractGoogleDriveFileId(url) !== null;
  } catch {
    return false;
  }
}

export async function fetchBarcodeImageBuffer(sourceUrl: string) {
  const candidates = getGoogleDriveImageCandidates(sourceUrl);

  for (const candidate of candidates) {
    const response = await fetch(candidate, {
      redirect: "follow",
      headers: { Accept: "image/*" },
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && contentType.startsWith("image/")) {
      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType,
      };
    }
  }

  throw new Error("BARCODE_FETCH_FAILED");
}
