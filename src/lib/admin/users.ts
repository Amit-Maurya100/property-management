import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/security/login";

const userPublicSelect = {
  id: true,
  username: true,
  email: true,
  accountStatus: true,
  isLocked: true,
  loginAttempts: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    where: { isActive: true },
    select: {
      id: true,
      role: { select: { id: true, name: true } },
    },
  },
} as const;

type UserClient = Pick<typeof prisma, "user">;

async function fetchUser(client: UserClient, id: string) {
  const user = await client.user.findUnique({
    where: { id },
    select: userPublicSelect,
  });
  if (!user) {
    throw new Error("NOT_FOUND");
  }
  return user;
}

export async function listUsers() {
  return prisma.user.findMany({
    select: userPublicSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function getUser(id: string) {
  return fetchUser(prisma, id);
}

export async function createUser(
  data: {
    username: string;
    email: string;
    password: string;
    roleIds?: string[];
  },
  grantedById: string,
) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { username: data.username }] },
  });
  if (existing) {
    throw new Error("CONFLICT:User with this email or username already exists");
  }

  const passwordHash = await hashPassword(data.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
      },
    });

    if (data.roleIds?.length) {
      await tx.userRole.createMany({
        data: data.roleIds.map((roleId) => ({
          userId: user.id,
          roleId,
          grantedBy: grantedById,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    return fetchUser(tx, user.id);
  });
}

export async function updateUser(
  id: string,
  data: {
    username?: string;
    email?: string;
    password?: string;
    accountStatus?: "ACTIVE" | "LOCKED" | "DISABLED" | "EXPIRED";
    roleIds?: string[];
  },
  grantedById: string,
) {
  await getUser(id);

  if (data.email || data.username) {
    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.username ? [{ username: data.username }] : []),
        ],
      },
    });
    if (conflict) {
      throw new Error("CONFLICT:User with this email or username already exists");
    }
  }

  const updateData: {
    username?: string;
    email?: string;
    passwordHash?: string;
    accountStatus?: "ACTIVE" | "LOCKED" | "DISABLED" | "EXPIRED";
    isLocked?: boolean;
    lockedUntil?: null;
    loginAttempts?: number;
  } = {};

  if (data.username) updateData.username = data.username;
  if (data.email) updateData.email = data.email;
  if (data.password) updateData.passwordHash = await hashPassword(data.password);
  if (data.accountStatus) {
    updateData.accountStatus = data.accountStatus;
    if (data.accountStatus === "ACTIVE") {
      updateData.isLocked = false;
      updateData.lockedUntil = null;
      updateData.loginAttempts = 0;
    }
  }

  return prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.user.update({ where: { id }, data: updateData });
    }

    if (data.roleIds) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (data.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: data.roleIds.map((roleId) => ({
            userId: id,
            roleId,
            grantedBy: grantedById,
            isActive: true,
          })),
        });
      }
    }

    return fetchUser(tx, id);
  });
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) {
    throw new Error("BAD_REQUEST:You cannot delete your own account");
  }
  await getUser(id);
  await prisma.user.delete({ where: { id } });
}
