import { auth } from "@/lib/auth";

export async function getAuthenticatedGstUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return BigInt(session.user.id);
}
