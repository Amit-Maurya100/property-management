import { handleApiError, jsonOk } from "@/lib/api/response";
import { auth } from "@/lib/auth";
import { getTenantPortalContext } from "@/lib/tenant-portal/context";
import { listTenantPortalPayments } from "@/lib/tenant-portal/portal-data";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async () => {
  try {
    const session = await auth();
    const { tenantId } = await getTenantPortalContext(session);
    return jsonOk(await listTenantPortalPayments(tenantId));
  } catch (error) {
    return handleApiError(error);
  }
}, "payment", "read");
