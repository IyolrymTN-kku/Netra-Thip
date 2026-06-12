import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/guards";
import { encrypt } from "@/lib/security/encryption";
import { logAudit, getClientIp } from "@/lib/audit/audit";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function GET() {
  const guard = await requireRole([Role.ADMIN, Role.PENTESTER]);
  if (!guard.ok) return guard.response;

  // We assume 1 user = 1 project for this demo. Fetch user's first project.
  const project = await prisma.project.findFirst({
    where: { userId: guard.session.user.id },
    select: { id: true }
  });
  if (!project) return NextResponse.json({ error: "No project found" }, { status: 404 });

  const keys = await prisma.apiKey.findMany({
    where: { projectId: project.id },
    select: { provider: true, createdAt: true, updatedAt: true, metadata: true },
  });

  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const guard = await requireRole([Role.ADMIN, Role.PENTESTER]);
  if (!guard.ok) return guard.response;

  const project = await prisma.project.findFirst({
    where: { userId: guard.session.user.id },
    select: { id: true }
  });
  if (!project) return NextResponse.json({ error: "No project found" }, { status: 404 });

  const json: unknown = await req.json().catch(() => null);
  if (!isRecord(json) || typeof json.provider !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const provider = json.provider.trim();
  const apiKey = typeof json.apiKey === "string" ? json.apiKey.trim() : "";
  const model = typeof json.model === "string" ? json.model.trim() : "";
  const baseUrl = typeof json.baseUrl === "string" ? json.baseUrl.trim() : "";

  // If no apiKey is provided, we might just be updating metadata.
  // Let's see if there is an existing key.
  const existing = await prisma.apiKey.findUnique({
    where: { projectId_provider: { projectId: project.id, provider } }
  });

  if (!apiKey && !existing) {
    return NextResponse.json({ error: "API Key is required for new configurations" }, { status: 400 });
  }

  const metadata: Prisma.InputJsonValue = { model, baseUrl };

  if (apiKey) {
    // Encrypt new key
    const { ciphertext, iv, authTag } = encrypt(apiKey);

    await prisma.apiKey.upsert({
      where: { projectId_provider: { projectId: project.id, provider } },
      update: { encryptedKey: ciphertext, iv, authTag, metadata },
      create: { projectId: project.id, provider, encryptedKey: ciphertext, iv, authTag, metadata },
    });
  } else {
    // Only update metadata
    await prisma.apiKey.update({
      where: { projectId_provider: { projectId: project.id, provider } },
      data: { metadata },
    });
  }

  // Audit: API key created/updated
  void logAudit({
    action: "API_KEY_CREATED",
    userId: guard.session.user.id,
    targetType: "ApiKey",
    metadata: { provider, hasNewKey: !!apiKey },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true });
}
