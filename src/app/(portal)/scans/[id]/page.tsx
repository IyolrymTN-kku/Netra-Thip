import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { ResultsHeader } from "@/components/results/ResultsHeader";
import { ResultsView } from "@/components/results/ResultsView";
import { ScanStatusPoller } from "@/components/results/ScanStatusPoller";

interface ScanPageProps {
  params: Promise<{ id: string }>;
}

export default async function ScanResultsPage({ params }: ScanPageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const scanJob = await prisma.scanJob.findFirst({
    where: { id, project: { userId: session.user.id } },
    select: {
      id: true,
      toolName: true,
      status: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      parameters: true,
    },
  });
  if (!scanJob) notFound();

  const findings = await prisma.finding.findMany({
    where: { scanJobId: id },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });

  const rows = findings.map((f) => ({
    ...f,
    scanJob: { toolName: scanJob.toolName },
  }));

  const isLive =
    scanJob.status === "PENDING" || scanJob.status === "RUNNING";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {isLive && (
        <ScanStatusPoller
          scanJobId={scanJob.id}
          initialStatus={scanJob.status}
        />
      )}
      <ResultsHeader scanJob={scanJob} findingCount={findings.length} />
      <ResultsView findings={rows} mode="scan" />
    </div>
  );
}
