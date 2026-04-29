import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { ResultsView } from "@/components/results/ResultsView";

export default async function FindingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const findings = await prisma.finding.findMany({
    where: { project: { userId: session.user.id } },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    include: { scanJob: { select: { toolName: true } } },
    take: 500,
  });

  return <ResultsView findings={findings} mode="global" />;
}
