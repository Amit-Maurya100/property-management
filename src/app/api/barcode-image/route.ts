import { NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/lib/api/response";
import {
  fetchBarcodeImageBuffer,
  isAllowedBarcodeProxySource,
} from "@/lib/images/resolve-image-url";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url).searchParams.get("url");
    if (!url || !isAllowedBarcodeProxySource(url)) {
      return jsonError("Invalid image URL", 400);
    }

    const { buffer, contentType } = await fetchBarcodeImageBuffer(url);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "BARCODE_FETCH_FAILED") {
      return jsonError(
        "Could not fetch barcode image. Ensure the Google Drive file is shared as Anyone with the link.",
        404,
      );
    }
    return handleApiError(error);
  }
}
