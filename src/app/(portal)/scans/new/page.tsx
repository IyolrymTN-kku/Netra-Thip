import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewScanLauncher } from "@/components/scans/NewScanLauncher";
import { getOrCreateDefaultProject } from "@/lib/projects/default";
import { prisma } from "@/lib/db/prisma";
import { getAiProviderMetadata } from "@/lib/settings/types";

export default async function NewScanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "VIEWER") redirect("/dashboard");

  const project = await getOrCreateDefaultProject(session.user.id);

  const savedConfigs = (await prisma.apiKey.findMany({
    where: { projectId: project.id },
    select: { provider: true, metadata: true },
  })).map((config) => ({
    provider: config.provider,
    metadata: getAiProviderMetadata(config.metadata),
  }));

  return <NewScanLauncher projectId={project.id} savedConfigs={savedConfigs} />;
}
