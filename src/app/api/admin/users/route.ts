import { auth } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/admin/users";
import { createUserSchema } from "@/lib/admin/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { withPermission } from "@/lib/permissions";

export const GET = withPermission(async () => {
  try {
    const users = await listUsers();
    return jsonOk(users);
  } catch (error) {
    return handleApiError(error);
  }
}, "user", "read");

export const POST = withPermission(async (request) => {
  try {
    const session = await auth();
    const body = createUserSchema.parse(await request.json());
    const user = await createUser(body, session!.user!.id);
    return jsonOk(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}, "user", "create");
