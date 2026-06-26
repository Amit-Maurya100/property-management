import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/security/login";

export const TENANT_ROLE_NAME = "tenant";
export const TENANT_SCOPE_TYPE = "tenant_record";

export function generateTenantDefaultPassword() {
  const fromEnv = process.env.TENANT_DEFAULT_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  return crypto.randomBytes(9).toString("base64url");
}

async function resolveUniqueUsername(email: string, tenantId: bigint) {
  const localPart = email.split("@")[0]?.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
  const base = localPart || `tenant${tenantId}`;
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
}

export async function provisionTenantLoginAccount(params: {
  tenantId: bigint;
  email: string;
  grantedById: bigint;
}) {
  const email = params.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("CONFLICT:A user account with this email already exists");
  }

  const tenantRole = await prisma.role.findUnique({ where: { name: TENANT_ROLE_NAME } });
  if (!tenantRole) {
    throw new Error("TENANT_ROLE_NOT_CONFIGURED");
  }

  const defaultPassword = generateTenantDefaultPassword();
  const passwordHash = await hashPassword(defaultPassword);
  const username = await resolveUniqueUsername(email, params.tenantId);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        email,
        passwordHash,
        mustChangePassword: true,
      },
    });

    const userRole = await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: tenantRole.id,
        grantedBy: params.grantedById,
        isActive: true,
      },
    });

    await tx.userRoleScope.create({
      data: {
        userRoleId: userRole.id,
        scopeType: TENANT_SCOPE_TYPE,
        scopeValue: String(params.tenantId),
      },
    });

    await tx.tenant.update({
      where: { id: params.tenantId },
      data: { userId: user.id },
    });

    return {
      userId: user.id,
      username,
      email,
      defaultPassword,
    };
  });
}
