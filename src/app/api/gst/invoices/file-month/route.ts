import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { fileGstInvoicesForMonth, type GstInvoiceType } from "@/lib/gst/invoices";
import { bulkFileGstInvoicesSchema } from "@/lib/gst/schemas";
import { requirePermission } from "@/lib/permissions";

const resourceForType: Record<GstInvoiceType, string> = {
  B2B_SALE: "gst_b2b_sale",
  B2C_SALE: "gst_b2c_sale",
  PURCHASE: "gst_purchase",
};

export async function POST(request: Request) {
  try {
    const body = bulkFileGstInvoicesSchema.parse(await request.json());
    await requirePermission(resourceForType[body.type], "update", { fresh: true });
    const userId = await getAuthenticatedGstUserId();
    return jsonOk(await fileGstInvoicesForMonth(userId, body.type, body.month));
  } catch (error) {
    return handleApiError(error);
  }
}
