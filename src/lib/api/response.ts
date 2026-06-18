import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/errors";
import { getZodErrorMessage, isZodError } from "@/lib/api/validation";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ForbiddenError) {
    return jsonError(error.message, error.message === "Unauthorized" ? 401 : 403);
  }

  if (isZodError(error)) {
    return jsonError(getZodErrorMessage(error), 400);
  }

  if (error instanceof Error) {
    if (error.message === "NOT_FOUND") {
      return jsonError("Not found", 404);
    }
    if (error.message.startsWith("CONFLICT:")) {
      return jsonError(error.message.replace("CONFLICT:", ""), 409);
    }
    if (error.message.startsWith("BAD_REQUEST:")) {
      return jsonError(error.message.replace("BAD_REQUEST:", ""), 400);
    }
  }

  console.error(error);
  return jsonError("Internal server error", 500);
}
