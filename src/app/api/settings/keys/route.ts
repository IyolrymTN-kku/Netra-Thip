import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/guards";
import { encrypt } from "@/lib/security/encryption";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const guard = await requireRole([Role.ADMIN, Role.PENTESTER]);
  if (!guard.ok) return guard.response;
  
  // We assume 1 user = 1 project for this demo. Fetch user's first project.
  const project = await prisma.project.findFirst({
    where: { userId: guard.session.user.id },
    select: { id: true }
  });
  if (!project) return NextResponse.json({ error: "No project found" }, { status: 404 });

  // Avoid TS errors by casting the query object
  const selectQuery: any = { provider: true, createdAt: true, updatedAt: true, metadata: true };
  const keys = await (prisma.apiKey as any).findMany({
    where: { projectId: project.id },
    select: selectQuery
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

  const json = await req.json().catch(() => null);
  if (!json || typeof json.provider !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { provider, apiKey, model, baseUrl } = json;
  
  // If no apiKey is provided, we might just be updating metadata.
  // Let's see if there is an existing key.
  const existing = await prisma.apiKey.findUnique({
    where: { projectId_provider: { projectId: project.id, provider } }
  });

  if (!apiKey && !existing) {
    return NextResponse.json({ error: "API Key is required for new configurations" }, { status: 400 });
  }

  const metadata = { model: model || "", baseUrl: baseUrl || "" };

  if (apiKey) {
    // Encrypt new key
    const { ciphertext, iv, authTag } = encrypt(apiKey);
    
    const updateData: any = { encryptedKey: ciphertext, iv, authTag, metadata };
    const createData: any = { projectId: project.id, provider, encryptedKey: ciphertext, iv, authTag, metadata };

    await (prisma.apiKey as any).upsert({
      where: { projectId_provider: { projectId: project.id, provider } },
      update: updateData,
      create: createData
    });
  } else {
    // Only update metadata
    const updateMetadata: any = { metadata };
    await (prisma.apiKey as any).update({
      where: { projectId_provider: { projectId: project.id, provider } },
      data: updateMetadata
    });
  }

  return NextResponse.json({ success: true });
}
