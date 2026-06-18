import { prisma } from "@/lib/db";

const catalogSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { permissions: true } },
} as const;

type CatalogClient = Pick<typeof prisma, "resource" | "action">;

export async function listResources(activeOnly = false) {
  return prisma.resource.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    select: catalogSelect,
    orderBy: { name: "asc" },
  });
}

export async function getResource(id: string) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: catalogSelect,
  });
  if (!resource) {
    throw new Error("NOT_FOUND");
  }
  return resource;
}

export async function createResource(data: {
  name: string;
  description?: string;
  isActive?: boolean;
}) {
  const existing = await prisma.resource.findUnique({
    where: { name: data.name },
  });
  if (existing) {
    throw new Error("CONFLICT:Resource name already exists");
  }

  return prisma.resource.create({
    data: {
      name: data.name,
      description: data.description,
      isActive: data.isActive ?? true,
    },
    select: catalogSelect,
  });
}

export async function updateResource(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    isActive?: boolean;
  },
) {
  await getResource(id);

  if (data.name) {
    const conflict = await prisma.resource.findFirst({
      where: { name: data.name, id: { not: id } },
    });
    if (conflict) {
      throw new Error("CONFLICT:Resource name already exists");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.resource.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: catalogSelect,
    });

    if (data.name) {
      await tx.$executeRaw`
        UPDATE "permissions"
        SET "resource" = ${data.name}
        WHERE "resource_id" = ${id}::uuid
      `;
    }

    return updated;
  });
}

export async function deleteResource(id: string) {
  const resource = await getResource(id);
  if (resource._count.permissions > 0) {
    throw new Error("BAD_REQUEST:Cannot delete resource used by permissions");
  }
  await prisma.resource.delete({ where: { id } });
}

export async function listActions(activeOnly = false) {
  return prisma.action.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    select: catalogSelect,
    orderBy: { name: "asc" },
  });
}

export async function getAction(id: string) {
  const action = await prisma.action.findUnique({
    where: { id },
    select: catalogSelect,
  });
  if (!action) {
    throw new Error("NOT_FOUND");
  }
  return action;
}

export async function createAction(data: {
  name: string;
  description?: string;
  isActive?: boolean;
}) {
  const existing = await prisma.action.findUnique({
    where: { name: data.name },
  });
  if (existing) {
    throw new Error("CONFLICT:Action name already exists");
  }

  return prisma.action.create({
    data: {
      name: data.name,
      description: data.description,
      isActive: data.isActive ?? true,
    },
    select: catalogSelect,
  });
}

export async function updateAction(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    isActive?: boolean;
  },
) {
  await getAction(id);

  if (data.name) {
    const conflict = await prisma.action.findFirst({
      where: { name: data.name, id: { not: id } },
    });
    if (conflict) {
      throw new Error("CONFLICT:Action name already exists");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.action.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: catalogSelect,
    });

    if (data.name) {
      await tx.$executeRaw`
        UPDATE "permissions"
        SET "action" = ${data.name}
        WHERE "action_id" = ${id}::uuid
      `;
    }

    return updated;
  });
}

export async function deleteAction(id: string) {
  const action = await getAction(id);
  if (action._count.permissions > 0) {
    throw new Error("BAD_REQUEST:Cannot delete action used by permissions");
  }
  await prisma.action.delete({ where: { id } });
}

export async function resolveResourceAndAction(
  data: { resourceId: string; actionId: string },
  client: CatalogClient = prisma,
) {
  const [resource, action] = await Promise.all([
    client.resource.findUnique({ where: { id: data.resourceId } }),
    client.action.findUnique({ where: { id: data.actionId } }),
  ]);

  if (!resource || !resource.isActive) {
    throw new Error("BAD_REQUEST:Invalid or inactive resource");
  }
  if (!action || !action.isActive) {
    throw new Error("BAD_REQUEST:Invalid or inactive action");
  }

  return { resource, action };
}
