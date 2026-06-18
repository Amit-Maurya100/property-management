import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import { assertUserOwnsProperty, ownerPropertyFilter } from "@/lib/properties/ownership";

const propertySelect = {
  id: true,
  name: true,
  description: true,
  propertyType: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  address: {
    select: {
      id: true,
      line1: true,
      line2: true,
      city: true,
      state: true,
      country: true,
      zipcode: true,
      latitude: true,
      longitude: true,
    },
  },
  amenities: {
    select: {
      amenity: { select: { id: true, name: true, category: true } },
    },
  },
} as const;

export async function listProperties(ctx: PropertyAccessContext) {
  return prisma.property.findMany({
    where: ownerPropertyFilter(ctx),
    select: propertySelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function getProperty(ctx: PropertyAccessContext, id: IdInput) {
  const propertyId = parseId(id);
  await assertUserOwnsProperty(ctx, propertyId);
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: propertySelect,
  });
  if (!property) throw new Error("NOT_FOUND");
  return property;
}

export async function createProperty(
  ctx: PropertyAccessContext,
  data: {
    name: string;
    description?: string;
    propertyType: "APARTMENT" | "HOTEL" | "HOSTEL" | "OFFICE";
    address: {
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      country: string;
      zipcode?: string;
      latitude?: number;
      longitude?: number;
    };
    amenityIds?: bigint[];
  },
) {
  return prisma.$transaction(async (tx) => {
    const address = await tx.address.create({
      data: {
        line1: data.address.line1,
        line2: data.address.line2,
        city: data.address.city,
        state: data.address.state,
        country: data.address.country,
        zipcode: data.address.zipcode,
        latitude: data.address.latitude != null ? new Prisma.Decimal(data.address.latitude) : null,
        longitude: data.address.longitude != null ? new Prisma.Decimal(data.address.longitude) : null,
      },
    });

    const property = await tx.property.create({
      data: {
        name: data.name,
        description: data.description,
        propertyType: data.propertyType,
        ownerId: ctx.userId,
        addressId: address.id,
      },
    });

    if (data.amenityIds?.length) {
      await tx.propertyAmenity.createMany({
        data: data.amenityIds.map((amenityId) => ({
          propertyId: property.id,
          amenityId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.property.findUniqueOrThrow({
      where: { id: property.id },
      select: propertySelect,
    });
  });
}

export async function updateProperty(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: {
    name?: string;
    description?: string | null;
    propertyType?: "APARTMENT" | "HOTEL" | "HOSTEL" | "OFFICE";
    address?: Partial<{
      line1: string;
      line2: string;
      city: string;
      state: string;
      country: string;
      zipcode: string;
      latitude: number;
      longitude: number;
    }>;
    amenityIds?: bigint[];
  },
) {
  const propertyId = parseId(id);
  const existing = await getProperty(ctx, propertyId);

  return prisma.$transaction(async (tx) => {
    if (data.address && Object.keys(data.address).length > 0) {
      const addressData: Prisma.AddressUpdateInput = {};
      if (data.address.line1) addressData.line1 = data.address.line1;
      if (data.address.line2 !== undefined) addressData.line2 = data.address.line2;
      if (data.address.city) addressData.city = data.address.city;
      if (data.address.state !== undefined) addressData.state = data.address.state;
      if (data.address.country) addressData.country = data.address.country;
      if (data.address.zipcode !== undefined) addressData.zipcode = data.address.zipcode;
      if (data.address.latitude !== undefined) {
        addressData.latitude = new Prisma.Decimal(data.address.latitude);
      }
      if (data.address.longitude !== undefined) {
        addressData.longitude = new Prisma.Decimal(data.address.longitude);
      }
      await tx.address.update({ where: { id: existing.address.id }, data: addressData });
    }

    await tx.property.update({
      where: { id: propertyId },
      data: {
        name: data.name,
        description: data.description,
        propertyType: data.propertyType,
      },
    });

    if (data.amenityIds) {
      await tx.propertyAmenity.deleteMany({ where: { propertyId } });
      if (data.amenityIds.length > 0) {
        await tx.propertyAmenity.createMany({
          data: data.amenityIds.map((amenityId) => ({ propertyId, amenityId })),
        });
      }
    }

    return tx.property.findUniqueOrThrow({
      where: { id: propertyId },
      select: propertySelect,
    });
  });
}

export async function deleteProperty(ctx: PropertyAccessContext, id: IdInput) {
  const propertyId = parseId(id);
  const existing = await getProperty(ctx, propertyId);
  await prisma.$transaction(async (tx) => {
    await tx.property.delete({ where: { id: propertyId } });
    await tx.address.delete({ where: { id: existing.address.id } });
  });
}
