import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isPublic =
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/api/auth");

      if (isPublic) {
        if (
          isLoggedIn &&
          (pathname.startsWith("/login") || pathname.startsWith("/register"))
        ) {
          return NextResponse.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.username = user.username;
        token.permissions = user.permissions;
        token.scopes = user.scopes;
        token.roles = user.roles;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.username = (token.username as string) ?? "";
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.scopes =
          (token.scopes as { type: string; value: string }[]) ?? [];
        session.user.roles = (token.roles as string[]) ?? [];
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
