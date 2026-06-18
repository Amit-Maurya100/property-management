import { z } from "zod";
import { prisma } from "@/lib/db";

export type IdInput = string | bigint;

export function parseId(value: IdInput): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("BAD_REQUEST:Invalid id");
  }

  return BigInt(trimmed);
}

export async function resolveUserId(value: IdInput): Promise<bigint> {
  if (typeof value === "bigint") {
    return value;
  }

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }

  const user = await prisma.user.findUnique({
    where: { uuid: trimmed },
    select: { id: true },
  });
  if (!user) {
    throw new Error("BAD_REQUEST:Invalid id");
  }

  return user.id;
}

export function idToString(value: IdInput): string {
  return parseId(value).toString();
}

export const idSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Invalid id")
  .transform((value) => BigInt(value));

export const idArraySchema = z
  .preprocess((value) => (value == null ? [] : value), z.array(idSchema))
  .default([]);

export function serializeJson<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      if (
        value &&
        typeof value === "object" &&
        "toFixed" in value &&
        typeof (value as { toFixed: unknown }).toFixed === "function"
      ) {
        return value.toString();
      }
      return value;
    }),
  ) as T;
}
