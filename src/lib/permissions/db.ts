import { prisma } from "@/lib/db";

export async function userHasPermissionInDb(
  userId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  const result = await prisma.$queryRaw<{ user_has_permission: boolean }[]>`
    SELECT user_has_permission(${userId}::uuid, ${resource}, ${action}) AS user_has_permission
  `;

  return result[0]?.user_has_permission ?? false;
}

export async function getUserPermissionsFromDb(userId: string) {
  return prisma.$queryRaw<
    {
      resource: string;
      action: string;
      permission_name: string;
      scope_type: string | null;
      scope_value: string | null;
    }[]
  >`
    SELECT resource, action, permission_name, scope_type, scope_value
    FROM get_user_permissions(${userId}::uuid)
  `;
}
