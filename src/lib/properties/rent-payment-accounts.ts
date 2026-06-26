import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import type { PropertyAccessContext } from "@/lib/properties/ownership";
import { assertUserOwnsTenant } from "@/lib/properties/ownership";

export const rentPaymentAccountSelect = {
  id: true,
  label: true,
  accountType: true,
  accountHolderName: true,
  bankName: true,
  accountNumber: true,
  branch: true,
  ifscCode: true,
  upiId: true,
  upiBarcodeUrl: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

type BankAccountInput = {
  label: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  ifscCode: string;
  isActive?: boolean;
  sortOrder?: number;
};

type UpiAccountInput = {
  label: string;
  upiId: string;
  upiBarcodeUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

function normalizeBarcodeUrl(url: string | null | undefined) {
  if (!url?.trim()) return null;
  return url.trim();
}

async function assertAccountOwned(ctx: PropertyAccessContext, accountId: IdInput) {
  const account = await prisma.rentPaymentAccount.findFirst({
    where: { id: parseId(accountId), ownerId: ctx.userId },
    select: { id: true },
  });
  if (!account) throw new Error("NOT_FOUND");
  return account;
}

export async function listRentPaymentAccounts(ctx: PropertyAccessContext) {
  return prisma.rentPaymentAccount.findMany({
    where: { ownerId: ctx.userId },
    select: rentPaymentAccountSelect,
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }, { id: "asc" }],
  });
}

export async function createBankPaymentAccount(
  ctx: PropertyAccessContext,
  data: BankAccountInput,
) {
  return prisma.rentPaymentAccount.create({
    data: {
      ownerId: ctx.userId,
      label: data.label.trim(),
      accountType: "BANK",
      accountHolderName: data.accountHolderName.trim(),
      bankName: data.bankName.trim(),
      accountNumber: data.accountNumber.trim(),
      branch: data.branch.trim(),
      ifscCode: data.ifscCode.trim().toUpperCase(),
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
    select: rentPaymentAccountSelect,
  });
}

export async function createUpiPaymentAccount(ctx: PropertyAccessContext, data: UpiAccountInput) {
  return prisma.rentPaymentAccount.create({
    data: {
      ownerId: ctx.userId,
      label: data.label.trim(),
      accountType: "UPI",
      upiId: data.upiId.trim(),
      upiBarcodeUrl: normalizeBarcodeUrl(data.upiBarcodeUrl),
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
    select: rentPaymentAccountSelect,
  });
}

export async function updateRentPaymentAccount(
  ctx: PropertyAccessContext,
  id: IdInput,
  data: Partial<BankAccountInput & UpiAccountInput & { accountType?: "BANK" | "UPI" }>,
) {
  await assertAccountOwned(ctx, id);

  return prisma.rentPaymentAccount.update({
    where: { id: parseId(id) },
    data: {
      ...(data.label != null ? { label: data.label.trim() } : {}),
      ...(data.accountHolderName != null
        ? { accountHolderName: data.accountHolderName.trim() }
        : {}),
      ...(data.bankName != null ? { bankName: data.bankName.trim() } : {}),
      ...(data.accountNumber != null ? { accountNumber: data.accountNumber.trim() } : {}),
      ...(data.branch != null ? { branch: data.branch.trim() } : {}),
      ...(data.ifscCode != null ? { ifscCode: data.ifscCode.trim().toUpperCase() } : {}),
      ...(data.upiId != null ? { upiId: data.upiId.trim() } : {}),
      ...(data.upiBarcodeUrl !== undefined
        ? { upiBarcodeUrl: normalizeBarcodeUrl(data.upiBarcodeUrl) }
        : {}),
      ...(data.isActive != null ? { isActive: data.isActive } : {}),
      ...(data.sortOrder != null ? { sortOrder: data.sortOrder } : {}),
    },
    select: rentPaymentAccountSelect,
  });
}

export async function deleteRentPaymentAccount(ctx: PropertyAccessContext, id: IdInput) {
  await assertAccountOwned(ctx, id);
  await prisma.rentPaymentAccount.delete({ where: { id: parseId(id) } });
}

export async function listTenantPaymentAccountIds(ctx: PropertyAccessContext, tenantId: IdInput) {
  await assertUserOwnsTenant(ctx, tenantId);
  const rows = await prisma.tenantRentPaymentAccount.findMany({
    where: { tenantId: parseId(tenantId) },
    select: { rentPaymentAccountId: true },
  });
  return rows.map((row) => row.rentPaymentAccountId);
}

export async function setTenantPaymentAccounts(
  ctx: PropertyAccessContext,
  tenantId: IdInput,
  accountIds: bigint[],
) {
  const tenantIdValue = parseId(tenantId);
  await assertUserOwnsTenant(ctx, tenantId);

  const ownedAccounts = await prisma.rentPaymentAccount.findMany({
    where: { ownerId: ctx.userId, id: { in: accountIds }, isActive: true },
    select: { id: true },
  });
  const ownedIds = new Set(ownedAccounts.map((row) => row.id));
  for (const accountId of accountIds) {
    if (!ownedIds.has(accountId)) {
      throw new Error("BAD_REQUEST:Invalid payment account selection");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenantRentPaymentAccount.deleteMany({ where: { tenantId: tenantIdValue } });
    if (accountIds.length > 0) {
      await tx.tenantRentPaymentAccount.createMany({
        data: accountIds.map((rentPaymentAccountId) => ({
          tenantId: tenantIdValue,
          rentPaymentAccountId,
        })),
        skipDuplicates: true,
      });
    }
  });

  return getTenantPaymentAccountAssignment(ctx, tenantId);
}

export async function listTenantAssignedPaymentAccounts(
  ctx: PropertyAccessContext,
  tenantId: IdInput,
) {
  await assertUserOwnsTenant(ctx, tenantId);
  const rows = await prisma.tenantRentPaymentAccount.findMany({
    where: { tenantId: parseId(tenantId) },
    select: {
      account: { select: rentPaymentAccountSelect },
    },
    orderBy: [{ account: { sortOrder: "asc" } }, { account: { label: "asc" } }],
  });
  return rows.map((row) => row.account);
}

export async function getTenantPaymentAccountAssignment(ctx: PropertyAccessContext, tenantId: IdInput) {
  await assertUserOwnsTenant(ctx, tenantId);
  const available = await listRentPaymentAccounts(ctx);
  const assigned = await listTenantAssignedPaymentAccounts(ctx, tenantId);
  const assignedIds = new Set(assigned.map((row) => row.id));
  return {
    available: available.filter((row) => row.isActive),
    assigned,
    assignedIds: [...assignedIds],
  };
}

export async function listPortalPaymentMethods(tenantId: bigint) {
  const rows = await prisma.tenantRentPaymentAccount.findMany({
    where: {
      tenantId,
      account: { isActive: true },
    },
    select: {
      account: { select: rentPaymentAccountSelect },
    },
    orderBy: [{ account: { sortOrder: "asc" } }, { account: { label: "asc" } }],
  });
  return rows.map((row) => row.account);
}
