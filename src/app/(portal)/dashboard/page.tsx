import { auth } from "@/auth";
import { Hero } from "@/components/dashboard/Hero";
import { KpiRow } from "@/components/dashboard/KpiRow";
import type { KpiCardProps } from "@/components/dashboard/KpiCard";

// TODO: replace static metrics with live aggregates from Prisma + Mongo.
const KPI_CARDS: KpiCardProps[] = [
  {
    icon: "scan",
    label: "Total Scans",
    value: "1,284",
    delta: "+12 this week",
    deltaKind: "up-good",
    accent: "var(--nt-blue)",
    sparkData: [12, 18, 14, 22, 19, 28, 24, 32, 29, 35, 40, 38, 44],
    footer: "across 47 targets",
  },
  {
    icon: "alert",
    label: "Critical Vulns",
    value: "47",
    delta: "+8 since Mon",
    deltaKind: "up-bad",
    accent: "var(--sev-critical)",
    sparkData: [22, 28, 31, 35, 30, 34, 36, 38, 40, 42, 45, 46, 47],
    sparkColor: "var(--sev-critical)",
    footer: "12 unassigned",
  },
  {
    icon: "bug",
    label: "High Vulns",
    value: "173",
    delta: "−6 vs last wk",
    deltaKind: "down-good",
    accent: "var(--sev-high)",
    sparkData: [180, 182, 179, 185, 178, 176, 180, 177, 174, 176, 175, 174, 173],
    sparkColor: "var(--sev-high)",
    footer: "94 in remediation",
  },
  {
    icon: "zap",
    label: "Active Tools",
    value: "6",
    unit: "/ 12",
    delta: "4 in queue",
    deltaKind: "neutral",
    accent: "var(--nt-cyan)",
    sparkData: [3, 4, 3, 5, 6, 5, 7, 6, 5, 6, 7, 6, 6],
    sparkColor: "var(--nt-cyan)",
    footer: "avg load 38%",
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name?.split(" ")[0] ?? "Operator";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Hero
        userName={userName}
        activeScans={6}
        lastSyncMinutesAgo={14}
        newScanHref="/scans/new"
      />
      <KpiRow cards={KPI_CARDS} />
    </div>
  );
}
