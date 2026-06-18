import { prisma } from "@/lib/db";
import { resolveUserId, type IdInput } from "@/lib/ids";

export async function userHasPermissionInDb(
  userId: IdInput,
  resource: string,
  action: string,
): Promise<boolean> {
  const id = await resolveUserId(userId);
  const result = await prisma.$queryRaw<{ user_has_permission: boolean }[]>`
    SELECT user_has_permission(
      ${id}::bigint,
      ${resource}::varchar,
      ${action}::varchar
    ) AS user_has_permission
  `;

  return result[0]?.user_has_permission ?? false;
}

export async function getUserPermissionsFromDb(userId: IdInput) {
  const id = await resolveUserId(userId);
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
    FROM get_user_permissions(${id}::bigint)
  `;
}
