import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { BCRYPT_ROUNDS } from "@/lib/errors";
import { getUserPermissionsFromDb } from "@/lib/permissions/db";
import type { UserScope } from "@/lib/permissions";

export type LoginContext = {
  ip?: string | null;
  userAgent?: string | null;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  username: string;
  permissions: string[];
  scopes: UserScope[];
  roles: string[];
};

export class LoginError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "LoginError";
  }
}

type FailedLoginResult = {
  success: boolean;
  message: string;
  remaining_attempts?: number | null;
  locked_until?: string;
  is_temporary?: boolean;
  is_permanent?: boolean;
};

async function autoUnlockExpiredAccounts(): Promise<void> {
  await prisma.$executeRaw`SELECT auto_unlock_expired_accounts()`;
}

function normalizeIp(ip?: string | null): string | null {
  if (!ip) {
    return null;
  }

  const first = ip.split(",")[0]?.trim();
  return first || null;
}

async function recordFailedLogin(
  email: string,
  context: LoginContext,
): Promise<FailedLoginResult> {
  const ip = normalizeIp(context.ip);
  const result = await prisma.$queryRaw<{ record_failed_login: FailedLoginResult }[]>`
    SELECT record_failed_login(
      ${email},
      ${ip}::inet,
      ${context.userAgent ?? null}
    ) AS record_failed_login
  `;

  return result[0]?.record_failed_login ?? {
    success: false,
    message: "Invalid credentials",
  };
}

async function recordSuccessfulLogin(
  email: string,
  context: LoginContext,
): Promise<void> {
  const ip = normalizeIp(context.ip);
  await prisma.$queryRaw`
    SELECT record_successful_login(
      ${email},
      ${ip}::inet,
      ${context.userAgent ?? null}
    )
  `;
}

async function loadUserAuthProfile(userId: string): Promise<AuthenticatedUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      userRoles: {
        where: {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          role: { select: { name: true } },
        },
      },
    },
  });

  const permissionRows = await getUserPermissionsFromDb(userId);
  const permissions = [
    ...new Set(
      permissionRows.map((row) => row.permission_name).filter(Boolean),
    ),
  ];

  const scopes: UserScope[] = [];
  for (const row of permissionRows) {
    if (row.scope_type && row.scope_value) {
      scopes.push({ type: row.scope_type, value: row.scope_value });
    }
  }

  const uniqueScopes = scopes.filter(
    (scope, index, array) =>
      array.findIndex(
        (item) => item.type === scope.type && item.value === scope.value,
      ) === index,
  );

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    permissions,
    scopes: uniqueScopes,
    roles: user.userRoles.map((userRole) => userRole.role.name),
  };
}

export async function authenticateUser(
  email: string,
  password: string,
  context: LoginContext = {},
): Promise<AuthenticatedUser> {
  await autoUnlockExpiredAccounts();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      passwordHash: true,
      accountStatus: true,
      isLocked: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    await recordFailedLogin(email, context);
    throw new LoginError("Invalid credentials");
  }

  if (user.accountStatus === "DISABLED") {
    throw new LoginError("Account disabled. Contact administrator.", "DISABLED");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new LoginError(
      `Account locked. Try again after ${user.lockedUntil.toISOString()}`,
      "LOCKED",
      { lockedUntil: user.lockedUntil.toISOString() },
    );
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    const failure = await recordFailedLogin(email, context);
    throw new LoginError(failure.message, "INVALID_CREDENTIALS", failure);
  }

  await recordSuccessfulLogin(email, context);
  return loadUserAuthProfile(user.id);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function adminUnlockUser(
  adminId: string,
  userEmail: string,
  reason?: string,
): Promise<{ success: boolean; message: string }> {
  const result = await prisma.$queryRaw<{ admin_unlock_user: { success: boolean; message: string } }[]>`
    SELECT admin_unlock_user(
      ${adminId}::uuid,
      ${userEmail},
      ${reason ?? null}
    ) AS admin_unlock_user
  `;

  return result[0]?.admin_unlock_user ?? {
    success: false,
    message: "Unlock failed",
  };
}
