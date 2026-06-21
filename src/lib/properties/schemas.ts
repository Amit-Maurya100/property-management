import { z } from "zod";
import { idArraySchema, idSchema } from "@/lib/ids";

const trimmedString = z.string().trim();

export const propertyTypeEnum = z.enum(["APARTMENT", "HOTEL", "HOSTEL", "OFFICE"]);
export const unitTypeEnum = z.enum(["APARTMENT", "ROOM", "OFFICE", "SHOP", "HALL"]);
export const roomTypeEnum = z.enum(["BEDROOM", "KITCHEN", "BATHROOM", "OFFICE_ROOM"]);
export const bedTypeEnum = z.enum(["SINGLE", "DOUBLE", "BUNK"]);
export const amenityCategoryEnum = z.enum(["INTERNET", "PARKING", "SECURITY"]);
export const billingCycleEnum = z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY"]);
export const availabilityStatusEnum = z.enum(["AVAILABLE", "RESERVED", "OCCUPIED"]);

const addressSchema = z.object({
  line1: trimmedString.min(1).max(255),
  line2: trimmedString.max(255).optional(),
  city: trimmedString.min(1).max(100),
  state: trimmedString.max(100).optional(),
  country: trimmedString.min(1).max(100),
  zipcode: trimmedString.max(20).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export const createPropertySchema = z.object({
  name: trimmedString.min(1).max(255),
  description: trimmedString.max(2000).optional(),
  propertyType: propertyTypeEnum,
  address: addressSchema,
  amenityIds: idArraySchema.optional(),
});

export const updatePropertySchema = z.object({
  name: trimmedString.min(1).max(255).optional(),
  description: trimmedString.max(2000).nullable().optional(),
  propertyType: propertyTypeEnum.optional(),
  address: addressSchema.partial().optional(),
  amenityIds: idArraySchema.optional(),
});

export const createBuildingSchema = z.object({
  propertyId: idSchema,
  name: trimmedString.min(1).max(255),
});

export const updateBuildingSchema = z.object({
  name: trimmedString.min(1).max(255).optional(),
  propertyId: idSchema.optional(),
});

export const createFloorSchema = z.object({
  buildingId: idSchema,
  floorNumber: z.coerce.number().int(),
});

export const updateFloorSchema = z.object({
  floorNumber: z.coerce.number().int().optional(),
  buildingId: idSchema.optional(),
});

export const createUnitSchema = z.object({
  floorId: idSchema,
  unitNumber: trimmedString.min(1).max(50),
  unitType: unitTypeEnum,
  capacity: z.coerce.number().int().positive().optional(),
  area: z.coerce.number().positive().optional(),
});

export const updateUnitSchema = z.object({
  unitNumber: trimmedString.min(1).max(50).optional(),
  unitType: unitTypeEnum.optional(),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  area: z.coerce.number().positive().nullable().optional(),
  floorId: idSchema.optional(),
});

export const createRoomSchema = z.object({
  unitId: idSchema,
  name: trimmedString.min(1).max(100),
  roomType: roomTypeEnum,
  area: z.coerce.number().positive().optional(),
});

export const updateRoomSchema = z.object({
  name: trimmedString.min(1).max(100).optional(),
  roomType: roomTypeEnum.optional(),
  area: z.coerce.number().positive().nullable().optional(),
  unitId: idSchema.optional(),
});

export const createBedSchema = z.object({
  roomId: idSchema,
  bedType: bedTypeEnum,
});

export const updateBedSchema = z.object({
  bedType: bedTypeEnum.optional(),
  roomId: idSchema.optional(),
});

export const createAmenitySchema = z.object({
  name: trimmedString.min(1).max(100),
  category: amenityCategoryEnum,
});

export const updateAmenitySchema = z.object({
  name: trimmedString.min(1).max(100).optional(),
  category: amenityCategoryEnum.optional(),
});

export const createPricingSchema = z.object({
  currency: trimmedString.length(3).toUpperCase(),
  basePrice: z.coerce.number().positive(),
  billingCycle: billingCycleEnum,
  securityDeposit: z.coerce.number().nonnegative().optional(),
  effectiveFrom: z.coerce.date().optional(),
});

export const createAvailabilitySchema = z.object({
  availableFrom: z.coerce.date().optional(),
  availableTo: z.coerce.date().optional(),
  status: availabilityStatusEnum,
});

export const updateAvailabilitySchema = createAvailabilitySchema.partial();

export const propertyFilterSchema = z.object({
  propertyId: idSchema.optional(),
  buildingId: idSchema.optional(),
  floorId: idSchema.optional(),
  unitId: idSchema.optional(),
  roomId: idSchema.optional(),
});

export const createTenantSchema = z.object({
  firstName: trimmedString.min(1).max(100),
  lastName: trimmedString.min(1).max(100),
  email: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    trimmedString.email().max(255).optional(),
  ),
  phone: trimmedString.max(30).optional(),
  idDocument: trimmedString.max(100).optional(),
  unitId: idSchema.optional(),
  pictureUrl: trimmedString.max(2048).optional(),
});

export const updateTenantSchema = createTenantSchema
  .extend({
    unitId: z.union([idSchema, z.null()]).optional(),
  })
  .partial();

export const createTenantAssignmentSchema = z.object({
  tenantId: idSchema,
  unitId: idSchema,
  monthlyRent: z.coerce.number().nonnegative().optional(),
  leaseFrom: z.coerce.date().optional(),
  leaseTo: z.coerce.date().optional(),
  monthlyDueDay: z.coerce.number().int().min(1).max(31).optional(),
  initialGasUnits: z.coerce.number().nonnegative().optional(),
  initialElectricityUnits: z.coerce.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
  notes: trimmedString.max(2000).optional(),
});

function emptyToNull(value: unknown) {
  return value === "" || value === null || value === undefined ? null : value;
}

const nullableAssignmentDate = z.preprocess(
  emptyToNull,
  z.union([z.null(), z.coerce.date()]).optional(),
);

const nullableAssignmentNumber = z.preprocess(
  emptyToNull,
  z.union([z.null(), z.coerce.number().nonnegative()]).optional(),
);

const nullableAssignmentDueDay = z.preprocess(
  emptyToNull,
  z.union([z.null(), z.coerce.number().int().min(1).max(31)]).optional(),
);

const nullableAssignmentNotes = z.preprocess(
  emptyToNull,
  z.union([z.null(), trimmedString.max(2000)]).optional(),
);

export const updateTenantAssignmentSchema = z
  .object({
    unitId: idSchema.optional(),
    monthlyRent: nullableAssignmentNumber,
    leaseFrom: nullableAssignmentDate,
    leaseTo: nullableAssignmentDate,
    monthlyDueDay: nullableAssignmentDueDay,
    initialGasUnits: nullableAssignmentNumber,
    initialElectricityUnits: nullableAssignmentNumber,
    isActive: z.boolean().optional(),
    notes: nullableAssignmentNotes,
  })
  .partial();

export const utilityBaselineSchema = z.object({
  electricityUnits: z.coerce.number().nonnegative(),
  gasUnits: z.coerce.number().nonnegative(),
});

export const utilityRateSnapshotSchema = z.object({
  electricityUnitRate: z.coerce.number().nonnegative(),
  gasUnitRate: z.coerce.number().nonnegative(),
  cleaningCharge: z.coerce.number().nonnegative(),
});

export const buildingUtilityTypeEnum = z.enum(["ELECTRICITY", "GAS", "CLEANING"]);

const buildingUtilityRateBaseSchema = z.object({
  buildingId: idSchema,
  utilityType: buildingUtilityTypeEnum,
  unitRate: z.coerce.number().nonnegative(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const createBuildingUtilityRateSchema = buildingUtilityRateBaseSchema.refine(
  (data) => data.endDate >= data.startDate,
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  },
);

export const updateBuildingUtilityRateSchema = buildingUtilityRateBaseSchema
  .omit({ buildingId: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" })
  .refine(
    (data) => data.startDate == null || data.endDate == null || data.endDate >= data.startDate,
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

export const createRentSchema = z.object({
  tenantId: idSchema,
  unitId: idSchema,
  tenantAssignmentId: idSchema.optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  rent: z.coerce.number().nonnegative(),
  totalRent: z.coerce.number().nonnegative().optional(),
  electricityUnits: z.coerce.number().nonnegative().optional(),
  gasUnits: z.coerce.number().nonnegative().optional(),
  maintenance: z.coerce.number().nonnegative().optional(),
  misc: z.coerce.number().nonnegative().optional(),
  dueDate: z.coerce.date(),
  utilityBaseline: utilityBaselineSchema.optional(),
  utilityRateSnapshot: utilityRateSnapshotSchema.optional(),
});

export const updateRentSchema = createRentSchema.partial();

export const paymentModeEnum = z.enum(["CASH", "CHEQUE", "NEFT", "UPI", "OTHER"]);

export const createPaymentSchema = z.object({
  rentId: idSchema,
  amount: z.coerce.number().positive(),
  mode: paymentModeEnum,
  paidAt: z.coerce.date().optional(),
  notes: trimmedString.max(2000).optional(),
});
