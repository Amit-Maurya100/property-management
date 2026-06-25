import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseId, type IdInput } from "@/lib/ids";
import { requireOrganizationForUser } from "@/lib/gst/organizations";

const bankAccountSelect = {
  id: true,
  gstMasterId: true,
  accountHolderName: true,
  bankName: true,
  accountNumber: true,
  branch: true,
  ifscCode: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function assertGstMasterOwned(userId: bigint, gstMasterId: bigint) {
  const organization = await requireOrganizationForUser(userId);
  const master = await prisma.gstMaster.findFirst({
    where: { id: gstMasterId, organizationId: organization.id },
    select: { id: true },
  });
  if (!master) throw new Error("NOT_FOUND");
  return { organization, master };
}

export async function listGstMasterBankAccounts(userId: bigint, gstMasterId: IdInput) {
  const masterId = parseId(gstMasterId);
  await assertGstMasterOwned(userId, masterId);

  return prisma.gstMasterBankAccount.findMany({
    where: { gstMasterId: masterId },
    select: bankAccountSelect,
    orderBy: [{ bankName: "asc" }, { accountNumber: "asc" }],
  });
}

export async function createGstMasterBankAccount(
  userId: bigint,
  gstMasterId: IdInput,
  data: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    branch: string;
    ifscCode: string;
  },
) {
  const masterId = parseId(gstMasterId);
  await assertGstMasterOwned(userId, masterId);

  return prisma.gstMasterBankAccount.create({
    data: {
      gstMasterId: masterId,
      accountHolderName: data.accountHolderName.trim(),
      bankName: data.bankName.trim(),
      accountNumber: data.accountNumber.trim(),
      branch: data.branch.trim(),
      ifscCode: data.ifscCode.trim().toUpperCase(),
    },
    select: bankAccountSelect,
  });
}

export async function updateGstMasterBankAccount(
  userId: bigint,
  gstMasterId: IdInput,
  bankAccountId: IdInput,
  data: Partial<{
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    branch: string;
    ifscCode: string;
  }>,
) {
  const masterId = parseId(gstMasterId);
  const accountId = parseId(bankAccountId);
  await assertGstMasterOwned(userId, masterId);

  const existing = await prisma.gstMasterBankAccount.findFirst({
    where: { id: accountId, gstMasterId: masterId },
    select: { id: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  return prisma.gstMasterBankAccount.update({
    where: { id: accountId },
    data: {
      ...(data.accountHolderName != null
        ? { accountHolderName: data.accountHolderName.trim() }
        : {}),
      ...(data.bankName != null ? { bankName: data.bankName.trim() } : {}),
      ...(data.accountNumber != null ? { accountNumber: data.accountNumber.trim() } : {}),
      ...(data.branch != null ? { branch: data.branch.trim() } : {}),
      ...(data.ifscCode != null ? { ifscCode: data.ifscCode.trim().toUpperCase() } : {}),
    },
    select: bankAccountSelect,
  });
}

export async function deleteGstMasterBankAccount(
  userId: bigint,
  gstMasterId: IdInput,
  bankAccountId: IdInput,
) {
  const masterId = parseId(gstMasterId);
  const accountId = parseId(bankAccountId);
  await assertGstMasterOwned(userId, masterId);

  const existing = await prisma.gstMasterBankAccount.findFirst({
    where: { id: accountId, gstMasterId: masterId },
    select: { id: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await prisma.gstMasterBankAccount.delete({ where: { id: accountId } });
}

export { bankAccountSelect };
