import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      permissions: string[];
      scopes: { type: string; value: string }[];
      roles: string[];
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    permissions: string[];
    scopes: { type: string; value: string }[];
    roles: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    permissions?: string[];
    scopes?: { type: string; value: string }[];
    roles?: string[];
  }
}
