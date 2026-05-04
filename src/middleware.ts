import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Exclude ALL /api/* routes from the auth middleware — each API route
  // enforces its own auth (HMAC signature, session check, etc.) internally.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
