import { prisma } from "@/lib/db";

const PROTECTED_ROLES = new Set(["super_admin"]);

const roleSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  rolePermissions: {
    select: {
      permission: {
        select: { id: true, resource: true, action: true, name: true },
      },
    },
  },
  _count: { select: { userRoles: true } },
} as const;

type RoleClient = Pick<typeof prisma, "role">;

async function fetchRole(client: RoleClient, id: string) {
  const role = await client.role.findUnique({
    where: { id },
    select: roleSelect,
  });
  if (!role) {
    throw new Error("NOT_FOUND");
  }
  return role;
}

export async function listRoles() {
  return prisma.role.findMany({
    select: roleSelect,
    orderBy: { name: "asc" },
  });
}

export async function getRole(id: string) {
  return fetchRole(prisma, id);
}

export async function createRole(data: {
  name: string;
  description?: string;
  permissionIds?: string[];
}) {
  const existing = await prisma.role.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new Error("CONFLICT:Role with this name already exists");
  }

  return prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });

    if (data.permissionIds?.length) {
      await tx.rolePermission.createMany({
        data: data.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return fetchRole(tx, role.id);
  });
}

export async function updateRole(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    permissionIds?: string[];
  },
) {
  const role = await getRole(id);

  if (PROTECTED_ROLES.has(role.name) && data.name && data.name !== role.name) {
    throw new Error("BAD_REQUEST:Cannot rename protected system role");
  }

  if (data.name) {
    const conflict = await prisma.role.findFirst({
      where: { name: data.name, id: { not: id } },
    });
    if (conflict) {
      throw new Error("CONFLICT:Role with this name already exists");
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.role.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });

    if (data.permissionIds) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (data.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    }

    return fetchRole(tx, id);
  });
}

export async function deleteRole(id: string) {
  const role = await getRole(id);
  if (PROTECTED_ROLES.has(role.name)) {
    throw new Error("BAD_REQUEST:Cannot delete protected system role");
  }
  if (role._count.userRoles > 0) {
    throw new Error("BAD_REQUEST:Cannot delete role assigned to users");
  }
  await prisma.role.delete({ where: { id } });
}
