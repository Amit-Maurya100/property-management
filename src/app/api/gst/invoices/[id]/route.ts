import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import { deleteGstInvoice } from "@/lib/gst/invoices";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { parseId } from "@/lib/ids";

const resourceForType = {
  B2B_SALE: "gst_b2b_sale",
  B2C_SALE: "gst_b2c_sale",
  PURCHASE: "gst_purchase",
} as const;

async function getOwnedInvoice(userId: bigint, id: string) {
  const invoiceId = parseId(id);
  const organization = await prisma.organization.findUnique({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (!organization) throw new Error("BAD_REQUEST:Organization not registered");

  const invoice = await prisma.gstInvoice.findFirst({
    where: { id: invoiceId, organizationId: organization.id },
    select: { id: true, invoiceType: true },
  });
  if (!invoice) throw new Error("NOT_FOUND");
  return invoice;
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userId = await getAuthenticatedGstUserId();
    const invoice = await getOwnedInvoice(userId, id);
    await requirePermission(resourceForType[invoice.invoiceType], "delete", { fresh: true });
    await deleteGstInvoice(userId, id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
