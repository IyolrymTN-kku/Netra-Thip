import "server-only";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_PROJECT_NAME = "Personal Workspace";

export async function getOrCreateDefaultProject(
  userId: string,
): Promise<{ id: string }> {
  const existing = await prisma.project.findFirst({
    where: { userId, name: DEFAULT_PROJECT_NAME },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.project.create({
    data: {
      userId,
      name: DEFAULT_PROJECT_NAME,
      description: "Auto-created default workspace.",
    },
    select: { id: true },
  });
}
