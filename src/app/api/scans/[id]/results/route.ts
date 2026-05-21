import { NextResponse } from "next/server";
import { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ResultsIngestInput } from "@/lib/findings/schema";
import { SIGNATURE_HEADER, verifySignature } from "@/lib/scans/signing";

export const runtime = "nodejs";

const TERMINAL: ReadonlySet<JobStatus> = new Set([
  JobStatus.COMPLETED,
  JobStatus.FAILED,
]);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: scanJobId } = await context.params;

  // HMAC: same trust boundary as /api/scans/callback. n8n echoes
  // X-Netra-Signature = HMAC(scanJobId, N8N_CALLBACK_SECRET).
  if (!verifySignature(scanJobId, req.headers.get(SIGNATURE_HEADER))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = ResultsIngestInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { findings } = parsed.data;

  const scanJob = await prisma.scanJob.findUnique({
    where: { id: scanJobId },
    select: { id: true, projectId: true, status: true },
  });
  if (!scanJob) {
    return NextResponse.json(
      { error: "scan job not found" },
      { status: 404 },
    );
  }
  if (TERMINAL.has(scanJob.status)) {
    return NextResponse.json(
      { error: `job already ${scanJob.status}` },
      { status: 409 },
    );
  }

  // Atomic: bulk-insert findings + flip status. Either both land or neither —
  // critical for replay protection if n8n retries.
  const result = await prisma.$transaction(async (tx) => {
    const inserted = await tx.finding.createMany({
      data: findings.map((f) => ({
        projectId: scanJob.projectId,
        scanJobId: scanJob.id,
        title: f.title,
        severity: f.severity,
        description: f.description,
        remediation: f.remediation,
        target: f.target,
        cvss: f.cvss ?? null,
        cves: f.cves ? ((f.cves as unknown) as Prisma.InputJsonValue) : Prisma.JsonNull,
        status: f.status ?? "OPEN",
      })),
    });
    const updated = await tx.scanJob.update({
      where: { id: scanJob.id },
      data: { status: JobStatus.COMPLETED, completedAt: new Date() },
    });
    return { inserted: inserted.count, scanJob: updated };
  });

  return NextResponse.json(result, { status: 201 });
}
