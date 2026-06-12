import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/guards";
import { enrichFindingWithCveDetails } from "@/lib/findings/cve-enrichment";
import { UpdateFindingInput } from "@/lib/findings/update-schema";
import { logAudit, getClientIp } from "@/lib/audit/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const guard = await requireRole([Role.ADMIN, Role.PENTESTER, Role.VIEWER]);
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const finding = await prisma.finding.findFirst({
    where: { id, project: { userId: session.user.id } },
    include: { scanJob: { select: { toolName: true } } },
  });
  if (!finding) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const enriched = await enrichFindingWithCveDetails(finding);

  return NextResponse.json({
    finding: {
      id: enriched.id,
      description: enriched.description,
      remediation: enriched.remediation,
      cvss: enriched.cvss,
      cves: enriched.cves,
    },
  });
}

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
    select: { id: true, status: true },
  });
  if (!finding) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const oldStatus = finding.status;

  const updated = await prisma.finding.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  // Audit: finding status changed
  void logAudit({
    action: "FINDING_STATUS_CHANGED",
    userId: session.user.id,
    targetType: "Finding",
    targetId: id,
    metadata: { oldStatus, newStatus: parsed.data.status },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ finding: updated });
}
