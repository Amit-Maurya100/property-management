import { z } from "zod";
import { listLoginAudits } from "@/lib/admin/login-audit";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  attemptType: z.enum(["SUCCESS", "FAILURE", "LOCKED"]).optional(),
});

export const GET = withPermission(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      attemptType: searchParams.get("attemptType") ?? undefined,
    });

    const result = await listLoginAudits(query);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}, "login_audit", "read");
