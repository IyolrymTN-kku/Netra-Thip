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
    select: { id: true, projectId: true, toolName: true, status: true },
  });
  if (!scanJob) {
    return NextResponse.json(
      { error: "scan job not found" },
      { status: 404 },
    );
  }
  const acceptsLateVulsTargets =
    scanJob.status === JobStatus.COMPLETED &&
    scanJob.toolName.toLowerCase() === "vuls";
  if (TERMINAL.has(scanJob.status) && !acceptsLateVulsTargets) {
    return NextResponse.json(
      { error: `job already ${scanJob.status}` },
      { status: 409 },
    );
  }

  // Initial deliveries complete the job. A later Vuls delivery may append a
  // previously missing target without duplicating targets already persisted.
  const result = await prisma.$transaction(async (tx) => {
    const existingTargets = acceptsLateVulsTargets
      ? new Set(
          (
            await tx.finding.findMany({
              where: { scanJobId: scanJob.id },
              distinct: ["target"],
              select: { target: true },
            })
          ).map((finding) => finding.target),
        )
      : new Set<string>();

    const findingsToInsert = acceptsLateVulsTargets
      ? findings.filter((finding) => !existingTargets.has(finding.target))
      : findings;

    const inserted = await tx.finding.createMany({
      data: findingsToInsert.map((f) => {
        return {
          projectId: scanJob.projectId,
          scanJobId: scanJob.id,
          title: f.title,
          severity: f.severity,
          description: f.description,
          remediation: f.remediation,
          target: f.target,
          cvss: f.cvss ?? null,
          cves: f.cves ? (f.cves as Prisma.InputJsonValue) : Prisma.DbNull,
          status: f.status ?? "OPEN",
        };
      }),
    });
    const updated = acceptsLateVulsTargets
      ? scanJob
      : await tx.scanJob.update({
          where: { id: scanJob.id },
          data: { status: JobStatus.COMPLETED, completedAt: new Date() },
        });

    return {
      inserted: inserted.count,
      skipped: findings.length - findingsToInsert.length,
      scanJob: updated,
    };
  });

  return NextResponse.json(result, { status: 201 });
}
