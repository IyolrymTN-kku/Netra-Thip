import "server-only";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";

interface AuthorizedSession {
  user: { id: string; email: string; role: Role; name?: string | null };
}

type RequireRoleResult =
  | { ok: true; session: AuthorizedSession }
  | { ok: false; response: NextResponse };

export async function requireRole(
  allowed: Role[],
): Promise<RequireRoleResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized" },
        { status: 401 },
      ),
    };
  }
  if (!allowed.includes(session.user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return {
    ok: true,
    session: {
      user: {
        id: session.user.id,
        email: session.user.email ?? "",
        role: session.user.role,
        name: session.user.name,
      },
    },
  };
}
