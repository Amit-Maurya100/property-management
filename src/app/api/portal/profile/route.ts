import { handleApiError, jsonOk } from "@/lib/api/response";
import { auth } from "@/lib/auth";
import { getTenantPortalContext } from "@/lib/tenant-portal/context";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async () => {
  try {
    const session = await auth();
    const { tenant } = await getTenantPortalContext(session);
    return jsonOk(tenant);
  } catch (error) {
    return handleApiError(error);
  }
}, "tenant", "read");
