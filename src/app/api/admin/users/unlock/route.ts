import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/errors";
import { adminUnlockUser } from "@/lib/security/login";
import { userHasPermissionInDb } from "@/lib/permissions/db";

const unlockSchema = z.object({
  email: z.string().email(),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await userHasPermissionInDb(session.user.id, "user", "update");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = unlockSchema.parse(await request.json());
    const result = await adminUnlockUser(
      session.user.id,
      body.email,
      body.reason,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
