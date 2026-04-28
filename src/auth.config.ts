import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no Prisma, no bcrypt. Used by the middleware which runs on
// the edge runtime. The full config (auth.ts) extends this with the Credentials
// provider's authorize() callback.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico";

      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as
          | "ADMIN"
          | "PENTESTER"
          | "VIEWER";
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
