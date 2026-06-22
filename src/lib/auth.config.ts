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
        delete token.invalidSession;
      } else if (token.sub && !/^\d+$/.test(String(token.sub))) {
        // Legacy session from before bigint user ids — force re-login.
        token.invalidSession = true;
      }
      return token;
    },
    session({ session, token }) {
      if (
        token.invalidSession ||
        !token.sub ||
        !/^\d+$/.test(String(token.sub))
      ) {
        return { ...session, user: undefined, expires: "1970-01-01T00:00:00.000Z" };
      }

      if (session.user) {
        session.user.id = token.sub;
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
