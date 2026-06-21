import { handleApiError, jsonOk } from "@/lib/api/response";
import { getAuthenticatedGstUserId } from "@/lib/gst/api";
import {
  createGstInvoice,
  listGstInvoices,
  type GstInvoiceType,
} from "@/lib/gst/invoices";
import {
  createB2bSaleInvoiceSchema,
  createB2cSaleInvoiceSchema,
  createPurchaseInvoiceSchema,
  gstInvoiceTypeEnum,
} from "@/lib/gst/schemas";
import { requirePermission } from "@/lib/permissions";
import { z } from "zod";

const createInvoiceBodySchema = z.discriminatedUnion("type", [
  createB2bSaleInvoiceSchema.extend({ type: z.literal("B2B_SALE") }),
  createB2cSaleInvoiceSchema.extend({ type: z.literal("B2C_SALE") }),
  createPurchaseInvoiceSchema.extend({ type: z.literal("PURCHASE") }),
]);

const resourceForType: Record<GstInvoiceType, string> = {
  B2B_SALE: "gst_b2b_sale",
  B2C_SALE: "gst_b2c_sale",
  PURCHASE: "gst_purchase",
};

export async function GET(request: Request) {
  try {
    const type = gstInvoiceTypeEnum.parse(new URL(request.url).searchParams.get("type"));
    await requirePermission(resourceForType[type], "read", { fresh: true });
    const userId = await getAuthenticatedGstUserId();
    return jsonOk(await listGstInvoices(userId, type));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createInvoiceBodySchema.parse(await request.json());
    await requirePermission(resourceForType[body.type], "create", { fresh: true });
    const userId = await getAuthenticatedGstUserId();
    const { type, ...rest } = body;
    if (type === "B2C_SALE") {
      const b2c = rest as z.infer<typeof createB2cSaleInvoiceSchema>;
      const { customerGstNumber, tradeName, ...data } = b2c;
      return jsonOk(
        await createGstInvoice(userId, type, {
          ...data,
          gstNumber: customerGstNumber ?? null,
          tradeName: tradeName ?? null,
        }),
        201,
      );
    }
    return jsonOk(await createGstInvoice(userId, type, rest), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
