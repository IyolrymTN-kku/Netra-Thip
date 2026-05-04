import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const job = await prisma.scanJob.findFirst({
    where: { id, project: { userId: session.user.id } },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
    },
  });
  if (!job) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
