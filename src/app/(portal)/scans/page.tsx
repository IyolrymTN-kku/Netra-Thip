import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { formatDistanceToNow } from "date-fns";

function readParameterString(parameters: unknown, key: string): string | null {
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    return null;
  }

  const value = (parameters as Record<string, unknown>)[key];
  if (value === undefined || value === null) return null;
  return String(value);
}

export default async function ScansListPage() {
  const session = await auth();
  if (!session?.user?.id) return redirect("/login");
  const userId = session.user.id;

  const scanJobs = await prisma.scanJob.findMany({
    where: { project: { userId } },
    select: {
      id: true,
      status: true,
      toolName: true,
      createdAt: true,
      completedAt: true,
      parameters: true,
      _count: {
        select: { findings: true }
      },
      findings: { select: { target: true }, take: 1 }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="mono" style={{ fontSize: 24, fontWeight: 600, margin: "0 0 4px 0", color: "var(--ink)" }}>Scan History</h1>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 14 }}>Track and review all security scans executed in your environment.</p>
        </div>
        <Link 
          href="/scans/new" 
          className="hover:brightness-110"
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: 8, 
            textDecoration: "none",
            background: "var(--primary, #0066FF)",
            border: "1px solid var(--primary, #0066FF)",
            borderRadius: 6,
            color: "#FFFFFF",
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 2px 4px rgba(0, 102, 255, 0.2)",
            transition: "all 0.2s"
          }}
        >
          <Icon name="plus" size={16} /> New Scan
        </Link>
      </div>

      {/* Table Card */}
      <div className="nt-card" style={{ overflow: "hidden" }}>
        {scanJobs.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-3)" }}>
              <tr>
                <th style={{ padding: "16px 24px", fontWeight: 600 }}>Target</th>
                <th style={{ padding: "16px 24px", fontWeight: 600 }}>Engine</th>
                <th style={{ padding: "16px 24px", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "16px 24px", fontWeight: 600 }}>Findings</th>
                <th style={{ padding: "16px 24px", fontWeight: 600 }}>Started</th>
                <th style={{ padding: "16px 24px", fontWeight: 600, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {scanJobs.map((scan, i) => {
                // Determine target
                let targetStr = "Unknown Target";
                if (scan.findings && scan.findings.length > 0) {
                  targetStr = scan.findings[0].target;
                } else if (scan.parameters && typeof scan.parameters === 'object' && !Array.isArray(scan.parameters)) {
                  targetStr =
                    readParameterString(scan.parameters, "target") ??
                    readParameterString(scan.parameters, "assetId") ??
                    "Unknown Target";
                }

                // Status styling
                let statusColor = "var(--ink-3)";
                let statusBg = "var(--surface-3)";
                let statusIcon: IconName = "play";

                if (scan.status === "COMPLETED") {
                  statusColor = "var(--ok)";
                  statusBg = "rgba(16, 185, 129, 0.1)"; // Emerald
                  statusIcon = "check";
                } else if (scan.status === "FAILED") {
                  statusColor = "var(--sev-critical)";
                  statusBg = "rgba(220, 38, 38, 0.1)"; // Red
                  statusIcon = "x";
                } else if (scan.status === "RUNNING") {
                  statusColor = "var(--nt-blue)";
                  statusBg = "rgba(59, 130, 246, 0.1)"; // Blue
                  statusIcon = "refresh";
                } else if (scan.status === "PENDING") {
                  statusColor = "var(--ink-2)";
                  statusIcon = "clock";
                }

                return (
                  <tr key={scan.id} style={{ borderBottom: i < scanJobs.length - 1 ? "1px solid var(--line)" : "none", transition: "background 0.2s" }} className="hover:bg-surface-2 group">

                    <td style={{ padding: "16px 24px" }}>
                      <Link href={`/scans/${scan.id}`} className="mono hover-underline" style={{ color: "var(--ink)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                        {targetStr}
                      </Link>
                      <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>ID: {scan.id.slice(0, 8)}...</div>
                    </td>

                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--surface-2)", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
                        <Icon name="zap" size={12} style={{ color: "var(--ink-3)" }} />
                        {scan.toolName}
                      </div>
                    </td>

                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: statusBg, color: statusColor, padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                        <Icon name={statusIcon} size={12} className={scan.status === "RUNNING" ? "animate-spin" : ""} />
                        {scan.status}
                      </div>
                    </td>

                    <td style={{ padding: "16px 24px" }}>
                      {scan.status === "COMPLETED" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="mono tnum" style={{ fontSize: 15, fontWeight: 700, color: scan._count.findings > 0 ? "var(--sev-high)" : "var(--ok)" }}>
                            {scan._count.findings}
                          </span>
                          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>vulns</span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--ink-3)", fontSize: 13 }}>-</span>
                      )}
                    </td>

                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
                        {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                        {new Date(scan.createdAt).toLocaleDateString()} {new Date(scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td style={{ padding: "16px 24px", textAlign: "right" }}>
                      <Link href={`/scans/${scan.id}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 16, background: "var(--surface-2)", color: "var(--ink-2)", transition: "all 0.2s" }} className="hover:bg-surface-3 hover:text-ink">
                        <Icon name="chevronRight" size={16} />
                      </Link>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 60, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
             <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)" }}>
               <Icon name="scan" size={32} />
             </div>
             <div>
               <h3 style={{ margin: "0 0 8px 0", color: "var(--ink)", fontSize: 18 }}>No scans executed yet</h3>
               <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 14 }}>Start your first security scan to populate this history.</p>
             </div>
             <Link 
               href="/scans/new" 
               className="hover:brightness-110"
               style={{ 
                 display: "inline-flex", 
                 alignItems: "center", 
                 gap: 8, 
                 textDecoration: "none", 
                 marginTop: 8,
                 background: "var(--primary, #0066FF)",
                 border: "1px solid var(--primary, #0066FF)",
                 borderRadius: 6,
                 color: "#FFFFFF",
                 padding: "10px 20px",
                 fontSize: 14,
                 fontWeight: 500,
                 boxShadow: "0 2px 4px rgba(0, 102, 255, 0.2)",
                 transition: "all 0.2s"
               }}
             >
               <Icon name="plus" size={16} /> Run a Scan
             </Link>
          </div>
        )}
      </div>
    </div>
  );
}
