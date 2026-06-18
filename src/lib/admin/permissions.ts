import { prisma } from "@/lib/db";
import { resolveResourceAndAction } from "@/lib/admin/catalogs";
import { parseId, type IdInput } from "@/lib/ids";

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

async function fetchPermission(client: PermissionClient, id: IdInput) {
  const permission = await client.permission.findUnique({
    where: { id: parseId(id) },
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

export async function getPermission(id: IdInput) {
  return fetchPermission(prisma, id);
}

export async function createPermission(data: {
  resourceId: IdInput;
  actionId: IdInput;
  description?: string;
}) {
  const resourceId = parseId(data.resourceId);
  const actionId = parseId(data.actionId);

  const existing = await prisma.permission.findFirst({
    where: { resourceId, actionId },
  });
  if (existing) {
    throw new Error("CONFLICT:Permission already exists for this resource and action");
  }

  const { resource, action } = await resolveResourceAndAction({
    resourceId,
    actionId,
  });

  const permission = await prisma.permission.create({
    data: {
      resourceId,
      actionId,
      resource: resource.name,
      action: action.name,
      name: `${resource.name}:${action.name}`,
      description: data.description,
    },
    select: { id: true },
  });

  return getPermission(permission.id);
}

export async function updatePermission(
  id: IdInput,
  data: {
    resourceId?: IdInput;
    actionId?: IdInput;
    description?: string | null;
  },
) {
  const permissionId = parseId(id);
  const current = await getPermission(permissionId);

  const resourceId = data.resourceId ? parseId(data.resourceId) : current.resourceId;
  const actionId = data.actionId ? parseId(data.actionId) : current.actionId;

  if (resourceId !== current.resourceId || actionId !== current.actionId) {
    const conflict = await prisma.permission.findFirst({
      where: {
        resourceId,
        actionId,
        id: { not: permissionId },
      },
    });
    if (conflict) {
      throw new Error("CONFLICT:Permission already exists for this resource and action");
    }

    const { resource, action } = await resolveResourceAndAction({
      resourceId,
      actionId,
    });

    await prisma.permission.update({
      where: { id: permissionId },
      data: {
        resourceId,
        actionId,
        resource: resource.name,
        action: action.name,
        name: `${resource.name}:${action.name}`,
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });
  } else if (data.description !== undefined) {
    await prisma.permission.update({
      where: { id: permissionId },
      data: { description: data.description },
    });
  }

  return getPermission(permissionId);
}

export async function deletePermission(id: IdInput) {
  const permissionId = parseId(id);
  const permission = await getPermission(permissionId);
  if (permission._count.rolePermissions > 0 || permission._count.policies > 0) {
    throw new Error("BAD_REQUEST:Cannot delete permission in use by roles or policies");
  }

  await prisma.permission.delete({ where: { id: permissionId } });
}
