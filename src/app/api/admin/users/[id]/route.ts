import { auth } from "@/lib/auth";
import { deleteUser, getUser, updateUser } from "@/lib/admin/users";
import { updateUserSchema } from "@/lib/admin/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export const GET = withPermission(async (_request, context) => {
  try {
    const { id } = await (context as Params).params;
    const user = await getUser(id);
    return jsonOk(user);
  } catch (error) {
    return handleApiError(error);
  }
}, "user", "read");

export const PATCH = withPermission(async (request, context) => {
  try {
    const session = await auth();
    const { id } = await (context as Params).params;
    const body = updateUserSchema.parse(await request.json());
    const user = await updateUser(id, body, session!.user!.id);
    return jsonOk(user);
  } catch (error) {
    return handleApiError(error);
  }
}, "user", "update");

export const DELETE = withPermission(async (_request, context) => {
  try {
    const session = await auth();
    const { id } = await (context as Params).params;
    await deleteUser(id, session!.user!.id);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}, "user", "delete");
