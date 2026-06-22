import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/ids";

export async function getAuthenticatedGstUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return resolveUserId(session.user.id);
}
