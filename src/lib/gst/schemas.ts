import { z } from "zod";
import { idSchema } from "@/lib/ids";
import { normalizeGstNumber } from "@/lib/gst/gst-number";
import {
  paymentAccountNameEnum,
  paymentModeEnum,
} from "@/lib/properties/schemas";
import {
  CONSTITUTION_OF_BUSINESS_OPTIONS,
  GSTIN_STATUS_OPTIONS,
  TAXPAYER_TYPE_OPTIONS,
  normalizeToGstMasterOption,
} from "@/lib/gst/gst-master-options";

const trimmedString = z.string().trim();

const gstNumberSchema = trimmedString.min(1).max(15).transform(normalizeGstNumber);
const optionalGstNumberSchema = trimmedString.max(15).transform(normalizeGstNumber).optional();
const nullableGstNumberSchema = trimmedString
  .max(15)
  .transform((value) => (value === "" ? null : normalizeGstNumber(value)))
  .nullable()
  .optional();

export const organizationStatusEnum = z.enum(["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"]);
export const gstInvoiceTypeEnum = z.enum(["B2B_SALE", "B2C_SALE", "PURCHASE"]);
export const gstPaymentStatusEnum = z.enum(["PENDING", "PARTIAL", "PAID"]);
export const gstFilingStatusEnum = z.enum(["PENDING", "FILED"]);

const addressSchema = z.object({
  line1: trimmedString.min(1).max(255),
  line2: trimmedString.max(255).optional(),
  city: trimmedString.min(1).max(100),
  state: trimmedString.max(100).optional(),
  country: trimmedString.min(1).max(100).default("India"),
  zipcode: trimmedString.max(20).optional(),
});

export const createOrganizationSchema = z.object({
  name: trimmedString.min(1).max(255),
  address: addressSchema,
  gstNumber: gstNumberSchema,
  ownerName: trimmedString.min(1).max(255),
  registrationDate: z.coerce.date(),
  currentStatus: organizationStatusEnum.default("ACTIVE"),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

const invoiceBaseSchema = z.object({
  invoiceNumber: trimmedString.min(1).max(100),
  invoiceDate: z.coerce.date(),
  taxableValue: z.coerce.number().nonnegative(),
  cess: z.coerce.number().nonnegative().default(0),
  description: trimmedString.max(2000).optional(),
});

const taxConfigurationBaseSchema = z.object({
  cgstRate: z.coerce.number().min(0).max(100),
  sgstRate: z.coerce.number().min(0).max(100),
  igstRate: z.coerce.number().min(0).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const createTaxConfigurationSchema = taxConfigurationBaseSchema.refine(
  (data) => data.endDate >= data.startDate,
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  },
);

export const updateTaxConfigurationSchema = taxConfigurationBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" })
  .refine(
    (data) =>
      data.startDate == null || data.endDate == null || data.endDate >= data.startDate,
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

export const createB2bSaleInvoiceSchema = invoiceBaseSchema.extend({
  gstNumber: gstNumberSchema,
  tradeName: trimmedString.min(1).max(255),
});

export const createB2cSaleInvoiceSchema = invoiceBaseSchema.extend({
  customerName: trimmedString.min(1).max(255),
  customerAddress: trimmedString.min(1).max(2000),
  customerGstNumber: optionalGstNumberSchema,
  tradeName: trimmedString.max(255).optional(),
});

export const createPurchaseInvoiceSchema = invoiceBaseSchema.extend({
  gstNumber: gstNumberSchema,
  tradeName: trimmedString.min(1).max(255),
});

export const updateGstInvoiceSchema = z
  .object({
    invoiceNumber: trimmedString.min(1).max(100).optional(),
    invoiceDate: z.coerce.date().optional(),
    gstNumber: nullableGstNumberSchema,
    tradeName: trimmedString.max(255).nullable().optional(),
    customerName: trimmedString.max(255).nullable().optional(),
    customerAddress: trimmedString.max(2000).nullable().optional(),
    customerGstNumber: optionalGstNumberSchema,
    taxableValue: z.coerce.number().nonnegative().optional(),
    cess: z.coerce.number().nonnegative().optional(),
    description: trimmedString.max(2000).nullable().optional(),
    filingStatus: gstFilingStatusEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const gstInvoiceTypeQuerySchema = z.object({
  type: gstInvoiceTypeEnum,
});

export const bulkFileGstInvoicesSchema = z.object({
  type: gstInvoiceTypeEnum,
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
});

export const gstInvoiceIdSchema = z.object({
  id: idSchema,
});

export const gstReportPeriodModeEnum = z.enum(["monthly", "quarterly", "yearly", "custom"]);

export const gstReportQuerySchema = z
  .object({
    mode: gstReportPeriodModeEnum,
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    quarter: z.coerce.number().int().min(1).max(4).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "monthly" && !data.month) {
      ctx.addIssue({ code: "custom", message: "month is required", path: ["month"] });
    }
    if (data.mode === "quarterly" && (!data.year || !data.quarter)) {
      ctx.addIssue({ code: "custom", message: "year and quarter are required", path: ["year"] });
    }
    if (data.mode === "yearly" && !data.year) {
      ctx.addIssue({ code: "custom", message: "year is required", path: ["year"] });
    }
    if (data.mode === "custom" && (!data.dateFrom || !data.dateTo)) {
      ctx.addIssue({ code: "custom", message: "dateFrom and dateTo are required", path: ["dateFrom"] });
    }
  });

function gstMasterOptionSchema<const T extends readonly [string, ...string[]]>(
  options: T,
  fieldLabel: string,
) {
  return trimmedString.superRefine((value, ctx) => {
    if (!normalizeToGstMasterOption(value, options)) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid ${fieldLabel}. Expected one of: ${options.join(", ")}`,
      });
    }
  }).transform((value) => normalizeToGstMasterOption(value, options)!);
}

const gstMasterBaseSchema = z.object({
  gstNumber: gstNumberSchema,
  legalName: trimmedString.min(1).max(255),
  tradeName: trimmedString.min(1).max(255),
  effectiveRegistrationDate: z.coerce.date(),
  constitutionOfBusiness: gstMasterOptionSchema(
    CONSTITUTION_OF_BUSINESS_OPTIONS,
    "constitution of business",
  ),
  gstinStatus: gstMasterOptionSchema(GSTIN_STATUS_OPTIONS, "GSTIN / UIN status"),
  taxpayerType: gstMasterOptionSchema(TAXPAYER_TYPE_OPTIONS, "taxpayer type"),
  principalPlaceOfBusiness: trimmedString.min(1).max(2000),
  primaryContact: trimmedString.max(255).optional(),
  secondaryContact: trimmedString.max(255).optional(),
});

const ifscCodeSchema = trimmedString
  .min(11)
  .max(11)
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value), {
    message: "Invalid IFSC code",
  });

export const gstMasterBankAccountBaseSchema = z.object({
  accountHolderName: trimmedString.min(1).max(255),
  bankName: trimmedString.min(1).max(255),
  accountNumber: trimmedString.min(1).max(50),
  branch: trimmedString.min(1).max(255),
  ifscCode: ifscCodeSchema,
});

export const createGstMasterBankAccountSchema = gstMasterBankAccountBaseSchema;

export const updateGstMasterBankAccountSchema = gstMasterBankAccountBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const createGstMasterSchema = gstMasterBaseSchema;

export const updateGstMasterSchema = gstMasterBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const gstMasterIdSchema = z.object({
  id: idSchema,
});

export const gstMasterSearchQuerySchema = z.object({
  q: trimmedString.min(7).max(100),
});

export const createGstPaymentSchema = z.object({
  gstInvoiceId: idSchema,
  amount: z.coerce.number().positive(),
  mode: paymentModeEnum,
  accountName: paymentAccountNameEnum.default("NONE"),
  paidAt: z.coerce.date().optional(),
  notes: trimmedString.max(2000).optional(),
});
