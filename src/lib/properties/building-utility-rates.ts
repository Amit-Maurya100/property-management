import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { BuildingUtilityType } from "@/lib/properties/building-utility-types";
import {
  BUILDING_UTILITY_LABELS,
  REQUIRED_BUILDING_UTILITY_TYPES,
  type BuildingUtilityRateSnapshot,
} from "@/lib/properties/building-utility-types";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import {
  assertUserOwnsBuilding,
  ownerPropertyFilter,
} from "@/lib/properties/ownership";
import { formatIsoDate, parseIsoDateLocal } from "@/lib/properties/rent-calculations";

const utilityRateSelect = {
  id: true,
  buildingId: true,
  utilityType: true,
  unitRate: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
  building: { select: { id: true, name: true, property: { select: { id: true, name: true } } } },
} as const;

function toMoney(value: Prisma.Decimal | string | number) {
  return Number(value);
}

export function isUtilityRateActive(startDate: Date, endDate: Date, onDate: Date) {
  const day = formatIsoDate(onDate);
  return formatIsoDate(startDate) <= day && day <= formatIsoDate(endDate);
}

export function isUtilityRateExpired(endDate: Date, onDate: Date) {
  return formatIsoDate(onDate) > formatIsoDate(endDate);
}

export async function getBuildingIdForUnit(unitId: bigint) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { floor: { select: { buildingId: true } } },
  });
  if (!unit) throw new Error("NOT_FOUND");
  return unit.floor.buildingId;
}

export async function listBuildingUtilityRates(
  ctx: PropertyAccessContext,
  filters: { buildingId?: bigint } = {},
) {
  const propertyFilter = ownerPropertyFilter(ctx);
  const rows = await prisma.buildingUtilityRate.findMany({
    where: {
      ...(filters.buildingId ? { buildingId: filters.buildingId } : {}),
      building: { property: propertyFilter },
    },
    select: utilityRateSelect,
    orderBy: [{ utilityType: "asc" }, { startDate: "desc" }, { id: "desc" }],
  });

  return rows.map((row) => ({
    ...row,
    unitRate: toMoney(row.unitRate),
    isExpired: isUtilityRateExpired(row.endDate, new Date()),
  }));
}

export async function createBuildingUtilityRate(
  ctx: PropertyAccessContext,
  data: {
    buildingId: bigint;
    utilityType: BuildingUtilityType;
    unitRate: number;
    startDate: Date;
    endDate: Date;
  },
) {
  await assertUserOwnsBuilding(ctx, data.buildingId);
  if (data.endDate < data.startDate) {
    throw new Error("BAD_REQUEST:End date must be on or after start date");
  }

  const row = await prisma.buildingUtilityRate.create({
    data: {
      buildingId: data.buildingId,
      utilityType: data.utilityType,
      unitRate: new Prisma.Decimal(data.unitRate),
      startDate: data.startDate,
      endDate: data.endDate,
    },
    select: utilityRateSelect,
  });

  return { ...row, unitRate: toMoney(row.unitRate), isExpired: false };
}

export async function updateBuildingUtilityRate(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: Partial<{
    utilityType: BuildingUtilityType;
    unitRate: number;
    startDate: Date;
    endDate: Date;
  }>,
) {
  const rateId = parseId(id);
  const existing = await prisma.buildingUtilityRate.findUnique({
    where: { id: rateId },
    select: { id: true, buildingId: true, startDate: true, endDate: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  await assertUserOwnsBuilding(ctx, existing.buildingId);

  const startDate = data.startDate ?? existing.startDate;
  const endDate = data.endDate ?? existing.endDate;
  if (endDate < startDate) {
    throw new Error("BAD_REQUEST:End date must be on or after start date");
  }

  const row = await prisma.buildingUtilityRate.update({
    where: { id: rateId },
    data: {
      ...(data.utilityType != null ? { utilityType: data.utilityType } : {}),
      ...(data.unitRate != null ? { unitRate: new Prisma.Decimal(data.unitRate) } : {}),
      ...(data.startDate != null ? { startDate: data.startDate } : {}),
      ...(data.endDate != null ? { endDate: data.endDate } : {}),
    },
    select: utilityRateSelect,
  });

  return {
    ...row,
    unitRate: toMoney(row.unitRate),
    isExpired: isUtilityRateExpired(row.endDate, new Date()),
  };
}

export async function deleteBuildingUtilityRate(ctx: PropertyAccessContext, id: IdInput) {
  const rateId = parseId(id);
  const existing = await prisma.buildingUtilityRate.findUnique({
    where: { id: rateId },
    select: { buildingId: true },
  });
  if (!existing) throw new Error("NOT_FOUND");
  await assertUserOwnsBuilding(ctx, existing.buildingId);
  await prisma.buildingUtilityRate.delete({ where: { id: rateId } });
}

export async function resolveActiveBuildingUtilityRates(
  buildingId: bigint,
  onDate: Date,
) {
  const rows = await prisma.buildingUtilityRate.findMany({
    where: { buildingId },
    orderBy: [{ utilityType: "asc" }, { startDate: "desc" }, { id: "desc" }],
  });

  const activeByType: Partial<Record<BuildingUtilityType, (typeof rows)[number]>> = {};
  for (const row of rows) {
    if (!activeByType[row.utilityType] && isUtilityRateActive(row.startDate, row.endDate, onDate)) {
      activeByType[row.utilityType] = row;
    }
  }

  return activeByType;
}

export function utilityRatesToSnapshot(
  activeByType: Partial<Record<BuildingUtilityType, { unitRate: Prisma.Decimal }>>,
): BuildingUtilityRateSnapshot {
  return {
    electricityUnitRate: activeByType.ELECTRICITY ? toMoney(activeByType.ELECTRICITY.unitRate) : 0,
    gasUnitRate: activeByType.GAS ? toMoney(activeByType.GAS.unitRate) : 0,
    cleaningCharge: activeByType.CLEANING ? toMoney(activeByType.CLEANING.unitRate) : 0,
  };
}

function utilityRateErrorMessage(
  type: BuildingUtilityType,
  rows: Array<{ utilityType: BuildingUtilityType }>,
) {
  const label = BUILDING_UTILITY_LABELS[type];
  const hasAny = rows.some((row) => row.utilityType === type);
  return hasAny ? `${label} price Expired` : `${label} rate not configured`;
}

export async function requireActiveBuildingUtilityRates(
  buildingId: bigint,
  onDate: Date,
): Promise<BuildingUtilityRateSnapshot> {
  const rows = await prisma.buildingUtilityRate.findMany({
    where: { buildingId },
    orderBy: [{ utilityType: "asc" }, { startDate: "desc" }, { id: "desc" }],
  });

  const activeByType: Partial<Record<BuildingUtilityType, (typeof rows)[number]>> = {};
  for (const row of rows) {
    if (!activeByType[row.utilityType] && isUtilityRateActive(row.startDate, row.endDate, onDate)) {
      activeByType[row.utilityType] = row;
    }
  }

  const missing = REQUIRED_BUILDING_UTILITY_TYPES.filter((type) => !activeByType[type]);

  if (missing.length > 0) {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { name: true },
    });
    const buildingLabel = building?.name ?? "Building";
    throw new Error(
      `BAD_REQUEST:${buildingLabel}: ${missing.map((type) => utilityRateErrorMessage(type, rows)).join("; ")}`,
    );
  }

  return utilityRatesToSnapshot(activeByType);
}

export async function getActiveBuildingUtilityRatesForUnit(
  ctx: PropertyAccessContext,
  unitId: bigint,
  onDate: Date,
) {
  const buildingId = await getBuildingIdForUnit(unitId);
  await assertUserOwnsBuilding(ctx, buildingId);
  return requireActiveBuildingUtilityRates(buildingId, onDate);
}
