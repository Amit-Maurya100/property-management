import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { normalizeGstNumber } from "@/lib/gst/gst-number";

const organizationSelect = {
  id: true,
  name: true,
  gstNumber: true,
  ownerName: true,
  registrationDate: true,
  currentStatus: true,
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
    },
  },
} as const;

export async function getOrganizationForUser(userId: bigint) {
  return prisma.organization.findUnique({
    where: { ownerId: userId },
    select: organizationSelect,
  });
}

export async function createOrganization(
  userId: bigint,
  data: {
    name: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      country: string;
      zipcode?: string;
    };
    gstNumber: string;
    ownerName: string;
    registrationDate: Date;
    currentStatus: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
  },
) {
  const existing = await prisma.organization.findUnique({ where: { ownerId: userId } });
  if (existing) {
    throw new Error("BAD_REQUEST:Organization already registered");
  }

  return prisma.$transaction(async (tx) => {
    const address = await tx.address.create({
      data: {
        line1: data.address.line1,
        line2: data.address.line2 ?? null,
        city: data.address.city,
        state: data.address.state ?? null,
        country: data.address.country,
        zipcode: data.address.zipcode ?? null,
      },
    });

    return tx.organization.create({
      data: {
        ownerId: userId,
        name: data.name,
        addressId: address.id,
        gstNumber: normalizeGstNumber(data.gstNumber),
        ownerName: data.ownerName,
        registrationDate: data.registrationDate,
        currentStatus: data.currentStatus,
      },
      select: organizationSelect,
    });
  });
}

export async function updateOrganization(
  userId: bigint,
  data: Partial<{
    name: string;
    gstNumber: string;
    ownerName: string;
    registrationDate: Date;
    currentStatus: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
    address: Partial<{
      line1: string;
      line2: string | null;
      city: string;
      state: string | null;
      country: string;
      zipcode: string | null;
    }>;
  }>,
) {
  const existing = await prisma.organization.findUnique({
    where: { ownerId: userId },
    select: { id: true, addressId: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    if (data.address && Object.keys(data.address).length > 0) {
      await tx.address.update({
        where: { id: existing.addressId },
        data: data.address,
      });
    }

    const { address: _address, ...orgData } = data;
    const normalizedOrgData = {
      ...orgData,
      ...(orgData.gstNumber != null ? { gstNumber: normalizeGstNumber(orgData.gstNumber) } : {}),
    };
    return tx.organization.update({
      where: { id: existing.id },
      data: normalizedOrgData,
      select: organizationSelect,
    });
  });
}

export async function requireOrganizationForUser(userId: bigint) {
  const organization = await getOrganizationForUser(userId);
  if (!organization) {
    throw new Error("BAD_REQUEST:Organization not registered");
  }
  return organization;
}
