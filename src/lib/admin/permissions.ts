import { prisma } from "@/lib/db";
import { resolveResourceAndAction } from "@/lib/admin/catalogs";

const permissionSelect = {
  id: true,
  resourceId: true,
  actionId: true,
  resource: true,
  action: true,
  name: true,
  description: true,
  createdAt: true,
  resourceRef: { select: { id: true, name: true } },
  actionRef: { select: { id: true, name: true } },
  _count: { select: { rolePermissions: true, policies: true } },
} as const;

type PermissionClient = Pick<typeof prisma, "permission">;

async function fetchPermission(client: PermissionClient, id: string) {
  const permission = await client.permission.findUnique({
    where: { id },
    select: permissionSelect,
  });
  if (!permission) {
    throw new Error("NOT_FOUND");
  }
  return permission;
}

export async function listPermissions() {
  return prisma.permission.findMany({
    select: permissionSelect,
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });
}

export async function getPermission(id: string) {
  return fetchPermission(prisma, id);
}

export async function createPermission(data: {
  resourceId: string;
  actionId: string;
  description?: string;
}) {
  const existing = await prisma.permission.findFirst({
    where: {
      resourceId: data.resourceId,
      actionId: data.actionId,
    },
  });
  if (existing) {
    throw new Error("CONFLICT:Permission already exists for this resource and action");
  }

  const { resource, action } = await resolveResourceAndAction(data);

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "permissions" ("resource_id", "action_id", "resource", "action", "description")
    VALUES (
      ${data.resourceId}::uuid,
      ${data.actionId}::uuid,
      ${resource.name},
      ${action.name},
      ${data.description ?? null}
    )
    RETURNING id
  `;

  const id = rows[0]?.id;
  if (!id) {
    throw new Error("BAD_REQUEST:Failed to create permission");
  }

  return getPermission(id);
}

export async function updatePermission(
  id: string,
  data: {
    resourceId?: string;
    actionId?: string;
    description?: string | null;
  },
) {
  const current = await getPermission(id);

  const resourceId = data.resourceId ?? current.resourceId;
  const actionId = data.actionId ?? current.actionId;

  if (resourceId !== current.resourceId || actionId !== current.actionId) {
    const conflict = await prisma.permission.findFirst({
      where: {
        resourceId,
        actionId,
        id: { not: id },
      },
    });
    if (conflict) {
      throw new Error("CONFLICT:Permission already exists for this resource and action");
    }

    const { resource, action } = await resolveResourceAndAction({
      resourceId,
      actionId,
    });

    await prisma.$executeRaw`
      UPDATE "permissions"
      SET "resource_id" = ${resourceId}::uuid,
          "action_id" = ${actionId}::uuid,
          "resource" = ${resource.name},
          "action" = ${action.name},
          "description" = COALESCE(${data.description ?? null}, "description")
      WHERE id = ${id}::uuid
    `;
  } else if (data.description !== undefined) {
    await prisma.permission.update({
      where: { id },
      data: { description: data.description },
    });
  }

  return getPermission(id);
}

export async function deletePermission(id: string) {
  const permission = await getPermission(id);
  if (permission._count.rolePermissions > 0 || permission._count.policies > 0) {
    throw new Error("BAD_REQUEST:Cannot delete permission in use by roles or policies");
  }

  await prisma.permission.delete({ where: { id } });
}
