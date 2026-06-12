import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewScanLauncher } from "@/components/scans/NewScanLauncher";
import { getOrCreateDefaultProject } from "@/lib/projects/default";

export default async function NewScanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "VIEWER") redirect("/dashboard");

  const project = await getOrCreateDefaultProject(session.user.id);
  return <NewScanLauncher projectId={project.id} />;
}
