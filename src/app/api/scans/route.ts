import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/guards";
import { CreateScanInput } from "@/lib/scans/schema";
import { getTool } from "@/lib/tools/registry";

export const runtime = "nodejs";

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
  const { toolName, projectId, target, assetType, parameters } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }

  // Strip secret-typed fields server-side as defence in depth — even if the
  // client kept them in `parameters`, they must never be persisted in plaintext.
  const tool = getTool(toolName);
  const sanitised: Record<string, unknown> = {};
  if (parameters && tool) {
    const secretIds = new Set(
      tool.fields.filter((f) => f.type === "secret").map((f) => f.id),
    );
    const fileIds = new Set(
      tool.fields.filter((f) => f.type === "file").map((f) => f.id),
    );
    for (const [k, v] of Object.entries(parameters)) {
      if (secretIds.has(k) || fileIds.has(k)) continue;
      sanitised[k] = v;
    }
  }

  await prisma.asset.upsert({
    where: { projectId_target: { projectId, target } },
    update: {},
    create: { projectId, target, type: assetType },
  });

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

  return NextResponse.json({ scanJob }, { status: 201 });
}
