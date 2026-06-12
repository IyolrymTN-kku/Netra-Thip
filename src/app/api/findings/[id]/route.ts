import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/guards";
import { UpdateFindingInput } from "@/lib/findings/update-schema";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const guard = await requireRole([Role.ADMIN, Role.PENTESTER]);
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const json = await req.json().catch(() => null);
  const parsed = UpdateFindingInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Cross-user defence: 404 (no existence disclosure) when the finding
  // belongs to another user's project.
  const finding = await prisma.finding.findFirst({
    where: { id, project: { userId: session.user.id } },
    select: { id: true },
  });
  if (!finding) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = await prisma.finding.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ finding: updated });
}
