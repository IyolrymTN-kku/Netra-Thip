import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/guards";
import { CreateScanInput } from "@/lib/scans/schema";
import { getTool } from "@/lib/tools/registry";
import {
  extractSecrets,
  persistSecrets,
  secretsToPlaintextMap,
} from "@/lib/scans/byok";
import { triggerScansAsync } from "@/lib/scans/trigger";
import { expandTargets } from "@/lib/scans/target-parser";
import { FileRefSchema } from "@/lib/scans/upload-schema";
import { assertPathInUserDir } from "@/lib/uploads/storage";

export const runtime = "nodejs";

function callbackUrl(req: Request): string {
  const fromEnv = process.env.NEXTAUTH_URL;
  if (fromEnv) return `${fromEnv.replace(/\/$/, "")}/api/scans/callback`;
  const origin = new URL(req.url).origin;
  return `${origin}/api/scans/callback`;
}

export async function POST(req: Request) {
  const guard = await requireRole([Role.ADMIN, Role.PENTESTER]);
  if (!guard.ok) return guard.response;
  const { session } = guard;

  const json = await req.json().catch(() => null);
  const parsed = CreateScanInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { toolName, projectId, target, assetType, parameters ,secrets: incomingSecrets} = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }

  const tool = getTool(toolName);
  if (!tool) {
    return NextResponse.json({ error: "unknown tool" }, { status: 400 });
  }

  const params: Record<string, unknown> = parameters ?? {};
  const bodySecrets: Record<string, unknown> = (incomingSecrets as Record<string, unknown>) ?? {};

  // ─── BYOK secrets: encrypt + persist, keep plaintext map in-memory only ───
  const secrets = extractSecrets(tool, bodySecrets); 
  await persistSecrets(projectId, secrets);
  const secretMap = secretsToPlaintextMap(secrets);

  // ─── File refs: validate shape + reject path traversal ───
  const fileRefs: Record<string, { path: string; originalName: string; size: number }> = {};
  for (const f of tool.fields) {
    if (f.type !== "file") continue;
    const candidate = params[f.id];
    if (candidate === undefined || candidate === null) continue;
    const refResult = FileRefSchema.safeParse(candidate);
    if (!refResult.success) {
      return NextResponse.json(
        { error: `invalid file ref for "${f.id}"` },
        { status: 400 },
      );
    }
    try {
      assertPathInUserDir(refResult.data.path, session.user.id);
    } catch {
      return NextResponse.json(
        { error: `file ref out of bounds for "${f.id}"` },
        { status: 400 },
      );
    }
    fileRefs[f.id] = refResult.data;
  }

  // ─── Sanitised parameters persisted on the ScanJob (no secrets, file refs OK) ───
  const sanitised: Record<string, unknown> = {};
  const secretIds = new Set(
    tool.fields.filter((f) => f.type === "secret").map((f) => f.id),
  );
  const fileIds = new Set(
    tool.fields.filter((f) => f.type === "file").map((f) => f.id),
  );
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (secretIds.has(k)) continue;
    if (fileIds.has(k)) continue;
    sanitised[k] = v;
  }
  for (const [fid, ref] of Object.entries(fileRefs)) sanitised[fid] = ref;

  const parsedTargets = expandTargets(target);
  if (parsedTargets.length > 256) {
    return NextResponse.json({ error: "too many targets (max 256)" }, { status: 400 });
  }

  for (const t of parsedTargets) {
    await prisma.asset.upsert({
      where: { projectId_target: { projectId, target: t } },
      update: {},
      create: { projectId, target: t, type: assetType },
    });
  }

  // Vuls and Sirius both support multi-target execution in one run. Keep
  // those results under one ScanJob so range scans render on one results page.
  const executionTargets =
    toolName === "vuls"
      ? [parsedTargets.join(",")]
      : toolName === "sirius"
        ? [target.trim()]
        : parsedTargets;

  const jobsToTrigger = [];

  for (const t of executionTargets) {

    const scanJob = await prisma.scanJob.create({
      data: {
        projectId,
        toolName,
        status: "PENDING",
        parameters:
          Object.keys(sanitised).length > 0
            ? (sanitised as Prisma.InputJsonValue)
            : Prisma.DbNull,
      },
    });

    jobsToTrigger.push({
      scanJob: {
        id: scanJob.id,
        projectId: scanJob.projectId,
        toolName: scanJob.toolName,
      },
      target: t,
    });
  }

  // Fire-and-forget. State transitions PENDING -> RUNNING (on 2xx) or
  // PENDING -> FAILED (on timeout / non-2xx) happen out of band.
  void triggerScansAsync({
    jobs: jobsToTrigger,
    assetType,
    parameters: sanitised,
    secrets: secretMap,
    fileRefs,
    callbackUrl: callbackUrl(req),
  });

  return NextResponse.json({ jobs: jobsToTrigger.map(j => j.scanJob) }, { status: 201 });
}
