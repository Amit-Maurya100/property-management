import { registerUserSchema } from "@/lib/auth/schemas";
import { registerUser } from "@/lib/auth/register";
import { handleApiError, jsonOk } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const body = registerUserSchema.parse(await request.json());
    const user = await registerUser({
      username: body.username,
      email: body.email,
      password: body.password,
    });
    return jsonOk(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
