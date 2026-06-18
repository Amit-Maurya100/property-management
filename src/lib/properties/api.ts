import { auth } from "@/lib/auth";
import { getPropertyAccessContext } from "@/lib/properties/ownership";

export async function getAuthenticatedPropertyContext() {
  const session = await auth();
  return getPropertyAccessContext(session);
}

export function parseFilterBigInt(value: string | null): bigint | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  return BigInt(value);
}
