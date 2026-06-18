import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { LoginError, authenticateUser } from "@/lib/security/login";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const ip =
          request?.headers?.get("x-forwarded-for") ??
          request?.headers?.get("x-real-ip");
        const userAgent = request?.headers?.get("user-agent");

        try {
          const user = await authenticateUser(parsed.data.email, parsed.data.password, {
            ip,
            userAgent,
          });

          return {
            id: user.id,
            email: user.email,
            name: user.username,
            username: user.username,
            permissions: user.permissions,
            scopes: user.scopes,
            roles: user.roles,
          };
        } catch (error) {
          if (error instanceof LoginError) {
            throw new InvalidCredentialsError(error.message);
          }
          return null;
        }
      },
    }),
  ],
});
