import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Hero } from "@/components/dashboard/Hero";
import { KpiRow } from "@/components/dashboard/KpiRow";
import type { KpiCardProps } from "@/components/dashboard/KpiCard";
import { ResultsDonut } from "@/components/results/ResultsDonut";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { redirect } from "next/navigation";

// Helper to generate sparkline data (new items per day over last 14 days)
function getSparkData(items: { createdAt: Date }[], days: number = 14) {
  const counts = new Array(days).fill(0);
  const now = new Date().getTime();
  items.forEach(item => {
    const diffDays = Math.floor((now - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < days) {
      counts[days - 1 - diffDays]++;
    }
  });
  // Smooth the data slightly to make sparklines look better if too sparse
  return counts.map((c, i, arr) => c === 0 && i > 0 ? arr[i-1] : c);
}

function readParameterString(parameters: unknown, key: string): string | null {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return null;
  }

  const value = (parameters as Record<string, unknown>)[key];
  if (value === undefined || value === null) return null;
  return String(value);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return redirect("/login");
  const userId = session.user.id;
  const userName = session.user.name?.split(" ")[0] ?? "Operator";

  // Fetch data
  const scanJobs = await prisma.scanJob.findMany({
    where: { project: { userId } },
    select: {
      id: true, status: true, toolName: true, createdAt: true, parameters: true,
      findings: { select: { target: true }, take: 1 }
    },
    orderBy: { createdAt: "desc" }
  });

  const findings = await prisma.finding.findMany({
    where: { project: { userId } },
    select: { id: true, severity: true, status: true, target: true, createdAt: true },
  });

  const assets = await prisma.asset.findMany({
    where: { project: { userId } },
    select: { id: true, target: true, type: true },
  });

  // Calculate Metrics
  const totalScans = scanJobs.length;
  const activeScans = scanJobs.filter(s => s.status === "RUNNING" || s.status === "PENDING").length;
  const uniqueTools = new Set(scanJobs.map(s => s.toolName)).size;

  const openFindings = findings.filter(f => f.status === "OPEN");
  const resolvedFindings = findings.filter(f => f.status === "RESOLVED");
  const criticalVulns = openFindings.filter(f => f.severity === "CRITICAL");
  const highVulns = openFindings.filter(f => f.severity === "HIGH");

  const resolutionRate = findings.length > 0 ? Math.round((resolvedFindings.length / findings.length) * 100) : 0;

  const recentActivity = scanJobs.slice(0, 6);

  // Top Vulnerable Assets
  const targetCounts: Record<string, number> = {};
  openFindings.forEach(f => {
    targetCounts[f.target] = (targetCounts[f.target] || 0) + 1;
  });

  const topAssets = Object.entries(targetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([target, count]) => {
      const assetInfo = assets.find(a => a.target === target);
      return {
        target,
        count,
        id: assetInfo?.id,
        type: assetInfo?.type || "UNKNOWN"
      };
    });

  // Prepare KPI Cards
  const KPI_CARDS: KpiCardProps[] = [
    {
      icon: "scan",
      label: "Total Scans",
      value: totalScans.toString(),
      delta: "All time",
      deltaKind: "neutral",
      accent: "var(--nt-blue)",
      sparkData: getSparkData(scanJobs),
      footer: `across ${assets.length} targets`,
    },
    {
      icon: "alert",
      label: "Critical Vulns",
      value: criticalVulns.length.toString(),
      delta: "Needs attention",
      deltaKind: "up-bad",
      accent: "var(--sev-critical)",
      sparkData: getSparkData(criticalVulns),
      sparkColor: "var(--sev-critical)",
      footer: "Open findings",
    },
    {
      icon: "bug",
      label: "High Vulns",
      value: highVulns.length.toString(),
      delta: "Priority fix",
      deltaKind: "up-bad",
      accent: "var(--sev-high)",
      sparkData: getSparkData(highVulns),
      sparkColor: "var(--sev-high)",
      footer: "Open findings",
    },
    {
      icon: "zap",
      label: "Active Tools",
      value: uniqueTools.toString(),
      delta: `${activeScans} scans running`,
      deltaKind: activeScans > 0 ? "up-good" : "neutral",
      accent: "var(--nt-cyan)",
      sparkData: getSparkData(scanJobs.filter(s => s.status === "RUNNING")),
      sparkColor: "var(--nt-cyan)",
      footer: "Integrated engines",
    },
  ];

  // Donut Chart Data
  const donutData = [
    { color: "var(--sev-critical)", value: criticalVulns.length },
    { color: "var(--sev-high)", value: highVulns.length },
    { color: "#EAB308", value: openFindings.filter(f => f.severity === "MEDIUM").length },
    { color: "var(--ok)", value: openFindings.filter(f => f.severity === "LOW" || f.severity === "INFO").length },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      <Hero
        userName={userName}
        activeScans={activeScans}
        lastSyncMinutesAgo={0}
        newScanHref="/scans/new"
      />

      <KpiRow cards={KPI_CARDS} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 18 }}>

        {/* Severity Overview */}
        <div className="nt-card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h2 style={{ margin: "0 0 24px 0", fontSize: 16, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="activity" size={16} style={{ color: "var(--ink-3)" }} />
            Severity Overview
          </h2>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {openFindings.length > 0 ? (
              <ResultsDonut data={donutData} total={openFindings.length} />
            ) : (
              <div style={{ textAlign: "center", color: "var(--ink-3)" }}>
                <Icon name="shield" size={32} style={{ color: "var(--ok)", marginBottom: 8, marginInline: "auto" }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ok)" }}>No Vulnerabilities</div>
                <div style={{ fontSize: 12 }}>Your environment is clean.</div>
              </div>
            )}
          </div>
        </div>

        {/* Top Vulnerable Assets */}
        <div className="nt-card" style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="target" size={16} style={{ color: "var(--ink-3)" }} />
            Top Vulnerable Assets
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topAssets.length > 0 ? topAssets.map((asset, i) => (
              <div key={asset.target} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface-1)", borderRadius: 8, border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 12, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--ink-2)" }}>
                    {i + 1}
                  </div>
                  <div>
                    {asset.id ? (
                      <Link href={`/assets/${asset.id}`} className="hover-underline mono" style={{ color: "var(--nt-blue)", fontWeight: 600, textDecoration: "none", fontSize: 14 }}>
                        {asset.target}
                      </Link>
                    ) : (
                      <span className="mono" style={{ color: "var(--ink)", fontWeight: 600, fontSize: 14 }}>{asset.target}</span>
                    )}
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {asset.type.replace("_", " ")}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="pulse-dot" style={{ background: "var(--sev-critical)", boxShadow: "0 0 0 2px rgba(220, 38, 38, 0.2)" }} />
                  <span className="mono tnum" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{asset.count}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)" }}>vulns</span>
                </div>
              </div>
            )) : (
              <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                No active findings.
              </div>
            )}
          </div>
        </div>

      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        {/* Recent Scan Activity */}
        <div className="nt-card" style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="clock" size={16} style={{ color: "var(--ink-3)" }} />
            Recent Scan Activity
          </h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentActivity.length > 0 ? recentActivity.map((scan, i) => {
              // Extract target from findings or parameters
              let targetStr = "Unknown Target";
              if (scan.findings && scan.findings.length > 0) {
                targetStr = scan.findings[0].target;
              } else if (scan.parameters && typeof scan.parameters === 'object' && !Array.isArray(scan.parameters)) {
                targetStr =
                  readParameterString(scan.parameters, "target") ??
                  readParameterString(scan.parameters, "assetId") ??
                  "Unknown Target";
              }

              let statusColor = "var(--ink-3)";
              let statusIcon: IconName = "play";
              if (scan.status === "COMPLETED") { statusColor = "var(--ok)"; statusIcon = "check"; }
              if (scan.status === "FAILED") { statusColor = "var(--sev-critical)"; statusIcon = "x"; }
              if (scan.status === "RUNNING") { statusColor = "var(--nt-blue)"; statusIcon = "refresh"; }

              return (
                <div key={scan.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < recentActivity.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: statusColor }}>
                      <Icon name={statusIcon} size={14} className={scan.status === "RUNNING" ? "animate-spin" : ""} />
                    </div>
                    <div>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{targetStr}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{scan.toolName}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: statusColor }}>{scan.status}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                      {new Date(scan.createdAt).toLocaleDateString()} {new Date(scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                No recent activity.
              </div>
            )}
          </div>
        </div>

        {/* Resolution Tracking */}
        <div className="nt-card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="shield" size={16} style={{ color: "var(--ink-3)" }} />
            Resolution Progress
          </h2>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div className="tnum" style={{ fontSize: 42, fontWeight: 700, color: resolutionRate >= 50 ? "var(--ok)" : "var(--sev-high)", lineHeight: 1 }}>
                {resolutionRate}%
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8 }}>Fix Rate</div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{resolvedFindings.length} Resolved</span>
                <span style={{ color: "var(--ink-3)" }}>{findings.length} Total</span>
              </div>
              <div style={{ height: 8, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${resolutionRate}%`, background: resolutionRate >= 50 ? "var(--ok)" : "var(--sev-high)", borderRadius: 4, transition: "width 1s ease" }} />
              </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--ink-3)" }}>Open Vulnerabilities</span>
              <span className="tnum" style={{ fontWeight: 700, color: "var(--ink)" }}>{openFindings.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
