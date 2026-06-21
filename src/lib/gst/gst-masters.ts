import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import { normalizeGstNumber } from "@/lib/gst/gst-number";
import { GST_MASTER_SEARCH_MIN_LENGTH } from "@/lib/gst/gst-master-options";
import { requireOrganizationForUser } from "@/lib/gst/organizations";
import { Prisma } from "@/generated/prisma/client";

const gstMasterSelect = {
  id: true,
  gstNumber: true,
  legalName: true,
  tradeName: true,
  effectiveRegistrationDate: true,
  constitutionOfBusiness: true,
  gstinStatus: true,
  taxpayerType: true,
  principalPlaceOfBusiness: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listGstMasters(userId: bigint) {
  const organization = await requireOrganizationForUser(userId);
  return prisma.gstMaster.findMany({
    where: { organizationId: organization.id },
    select: gstMasterSelect,
    orderBy: [{ legalName: "asc" }, { gstNumber: "asc" }],
  });
}

export async function createGstMaster(
  userId: bigint,
  data: {
    gstNumber: string;
    legalName: string;
    tradeName: string;
    effectiveRegistrationDate: Date;
    constitutionOfBusiness: string;
    gstinStatus: string;
    taxpayerType: string;
    principalPlaceOfBusiness: string;
  },
) {
  const organization = await requireOrganizationForUser(userId);
  const gstNumber = normalizeGstNumber(data.gstNumber);

  try {
    return await prisma.gstMaster.create({
      data: {
        organizationId: organization.id,
        gstNumber,
        legalName: data.legalName,
        tradeName: data.tradeName,
        effectiveRegistrationDate: data.effectiveRegistrationDate,
        constitutionOfBusiness: data.constitutionOfBusiness,
        gstinStatus: data.gstinStatus,
        taxpayerType: data.taxpayerType,
        principalPlaceOfBusiness: data.principalPlaceOfBusiness,
      },
      select: gstMasterSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("BAD_REQUEST:GST number already exists in master");
    }
    throw error;
  }
}

export async function updateGstMaster(
  userId: bigint,
  id: IdInput,
  data: Partial<{
    gstNumber: string;
    legalName: string;
    tradeName: string;
    effectiveRegistrationDate: Date;
    constitutionOfBusiness: string;
    gstinStatus: string;
    taxpayerType: string;
    principalPlaceOfBusiness: string;
  }>,
) {
  const organization = await requireOrganizationForUser(userId);
  const masterId = parseId(id);

  const existing = await prisma.gstMaster.findFirst({
    where: { id: masterId, organizationId: organization.id },
    select: { id: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  try {
    return await prisma.gstMaster.update({
      where: { id: masterId },
      data: {
        ...(data.gstNumber != null ? { gstNumber: normalizeGstNumber(data.gstNumber) } : {}),
        ...(data.legalName != null ? { legalName: data.legalName } : {}),
        ...(data.tradeName != null ? { tradeName: data.tradeName } : {}),
        ...(data.effectiveRegistrationDate != null
          ? { effectiveRegistrationDate: data.effectiveRegistrationDate }
          : {}),
        ...(data.constitutionOfBusiness != null
          ? { constitutionOfBusiness: data.constitutionOfBusiness }
          : {}),
        ...(data.gstinStatus != null ? { gstinStatus: data.gstinStatus } : {}),
        ...(data.taxpayerType != null ? { taxpayerType: data.taxpayerType } : {}),
        ...(data.principalPlaceOfBusiness != null
          ? { principalPlaceOfBusiness: data.principalPlaceOfBusiness }
          : {}),
      },
      select: gstMasterSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("BAD_REQUEST:GST number already exists in master");
    }
    throw error;
  }
}

export async function deleteGstMaster(userId: bigint, id: IdInput) {
  const organization = await requireOrganizationForUser(userId);
  const masterId = parseId(id);

  const existing = await prisma.gstMaster.findFirst({
    where: { id: masterId, organizationId: organization.id },
    select: { id: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await prisma.gstMaster.delete({ where: { id: masterId } });
}

export async function searchGstMasters(userId: bigint, query: string) {
  const trimmed = query.trim();
  if (trimmed.length < GST_MASTER_SEARCH_MIN_LENGTH) {
    return [];
  }

  const organization = await requireOrganizationForUser(userId);
  const gstPrefix = normalizeGstNumber(trimmed);

  return prisma.gstMaster.findMany({
    where: {
      organizationId: organization.id,
      OR: [
        { tradeName: { contains: trimmed, mode: "insensitive" } },
        { legalName: { contains: trimmed, mode: "insensitive" } },
        { gstNumber: { startsWith: gstPrefix } },
      ],
    },
    select: {
      gstNumber: true,
      tradeName: true,
      legalName: true,
    },
    orderBy: [{ tradeName: "asc" }, { gstNumber: "asc" }],
    take: 10,
  });
}

export async function ensureGstMasterForParty(
  userId: bigint,
  input: {
    gstNumber: string;
    tradeName: string;
    effectiveRegistrationDate?: Date;
  },
) {
  const gstNumber = normalizeGstNumber(input.gstNumber);
  const tradeName = input.tradeName.trim();
  if (!gstNumber || !tradeName) return null;

  const organization = await requireOrganizationForUser(userId);
  const existing = await prisma.gstMaster.findFirst({
    where: { organizationId: organization.id, gstNumber },
    select: { id: true },
  });
  if (existing) return existing;

  try {
    return await prisma.gstMaster.create({
      data: {
        organizationId: organization.id,
        gstNumber,
        legalName: tradeName,
        tradeName,
        effectiveRegistrationDate: input.effectiveRegistrationDate ?? new Date(),
        constitutionOfBusiness: "Other",
        gstinStatus: "Active",
        taxpayerType: "Regular",
        principalPlaceOfBusiness: "To be updated",
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.gstMaster.findFirst({
        where: { organizationId: organization.id, gstNumber },
        select: { id: true },
      });
    }
    throw error;
  }
}

export async function getGstMasterByNumber(userId: bigint, gstNumber: string) {
  const organization = await requireOrganizationForUser(userId);
  return prisma.gstMaster.findFirst({
    where: {
      organizationId: organization.id,
      gstNumber: normalizeGstNumber(gstNumber),
    },
    select: gstMasterSelect,
  });
}
