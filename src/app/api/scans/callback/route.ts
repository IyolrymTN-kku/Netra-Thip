import { NextResponse } from "next/server";
import { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ScanCallbackInput } from "@/lib/scans/callback-schema";
import { SIGNATURE_HEADER, verifySignature } from "@/lib/scans/signing";

export const runtime = "nodejs";

const TERMINAL: ReadonlySet<JobStatus> = new Set([
  JobStatus.COMPLETED,
  JobStatus.FAILED,
]);

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = ScanCallbackInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { scanJobId, status, failureReason, rawMongoId } = parsed.data;

  // HMAC: trigger sent X-Netra-Signature = HMAC(scanJobId, N8N_CALLBACK_SECRET);
  // n8n must echo it back verbatim. Without it the route is a wide-open status mutator.
  const presented = req.headers.get(SIGNATURE_HEADER);
  if (!verifySignature(scanJobId, presented)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const job = await prisma.scanJob.findUnique({
    where: { id: scanJobId },
    select: { id: true, status: true, parameters: true },
  });
  if (!job) {
    return NextResponse.json({ error: "scan job not found" }, { status: 404 });
  }
  if (TERMINAL.has(job.status)) {
    return NextResponse.json(
      { error: `job already ${job.status}` },
      { status: 409 },
    );
  }

  const merged: Record<string, unknown> = {
    ...((job.parameters as Record<string, unknown> | null) ?? {}),
  };
  if (status === "FAILED" && failureReason) {
    merged._failureReason = failureReason;
  }

  try {
    const updated = await prisma.scanJob.update({
      where: { id: scanJobId },
      data: {
        status,
        completedAt: new Date(),
        rawMongoId: rawMongoId ?? null,
        parameters:
          Object.keys(merged).length > 0
            ? (merged as Prisma.InputJsonValue)
            : Prisma.DbNull,
      },
    });
    return NextResponse.json({ ok: true, job: updated }, { status: 200 });
  } catch (err) {
    console.error("[callback] update failed:", err);
    return NextResponse.json(
      { error: "internal error" },
      { status: 500 },
    );
  }
}
