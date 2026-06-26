import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { resolveUserId } from "@/lib/ids";
import { hashPassword } from "@/lib/security/login";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return handleApiError(new Error("UNAUTHORIZED"));
    }

    const body = changePasswordSchema.parse(await request.json());
    const userId = await resolveUserId(session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) {
      return handleApiError(new Error("NOT_FOUND"));
    }

    const currentValid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!currentValid) {
      return handleApiError(new Error("BAD_REQUEST:Current password is incorrect"));
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(body.newPassword),
        mustChangePassword: false,
      },
    });

    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
