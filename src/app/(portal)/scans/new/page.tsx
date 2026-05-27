import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewScanLauncher } from "@/components/scans/NewScanLauncher";
import { getOrCreateDefaultProject } from "@/lib/projects/default";
import { prisma } from "@/lib/db/prisma";

export default async function NewScanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "VIEWER") redirect("/dashboard");

  const project = await getOrCreateDefaultProject(session.user.id);
  
  const selectQuery: any = { provider: true, metadata: true };
  const savedConfigs = await prisma.apiKey.findMany({
    where: { projectId: project.id },
    select: selectQuery
  });

  return <NewScanLauncher projectId={project.id} savedConfigs={savedConfigs} />;
}
