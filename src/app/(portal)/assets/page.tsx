import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Icon } from "@/components/icons/Icon";
import { AssetType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function deleteAsset(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.asset.delete({ where: { id } });
  revalidatePath("/assets");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // 1. Fetch all assets
  const assets = await prisma.asset.findMany({
    where: { project: { userId: session.user.id } },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch OPEN findings to join
  const findings = await prisma.finding.findMany({
    where: {
      project: { userId: session.user.id },
      status: "OPEN"
    },
    orderBy: { createdAt: "desc" }
  });

  // 3. Map findings to assets
  const assetReports = assets.map((asset) => {
    const assetFindings = findings.filter((f) => f.target === asset.target);

    let lastSeen = asset.createdAt;
    if (assetFindings.length > 0) {
      // Since findings are ordered by desc, the first one is the most recent
      lastSeen = assetFindings[0].createdAt;
    }

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of assetFindings) {
      if (f.severity === "CRITICAL") severityCounts.critical++;
      else if (f.severity === "HIGH") severityCounts.high++;
      else if (f.severity === "MEDIUM") severityCounts.medium++;
      else if (f.severity === "LOW") severityCounts.low++;
      else if (f.severity === "INFO") severityCounts.info++;
    }

    return {
      id: asset.id,
      shortId: asset.id.slice(-8), // Extract last 8 chars for compact view
      target: asset.target,
      type: asset.type,
      vulnerabilityCount: assetFindings.length,
      severityCounts,
      scanStatus: assetFindings.length > 0 ? "VULNERABLE" : "CLEAN",
      lastSeen,
    };
  });

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case "IP": return "server";
      case "DOMAIN":
      case "URL": return "globe";
      case "USER": return "user";
      default: return "target";
    }
  };

  return (
    <div className="nt-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-thai)", margin: 0 }}>
          Assets
        </h1>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
          Identity & Network Targets
        </div>
      </header>

      <div className="nt-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--ink-3)" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Target Asset</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Type</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Last Seen</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Asset ID</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>Criticality</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {assetReports.map((report) => (
              <tr key={report.id} style={{ borderBottom: "1px solid var(--line)" }} className="nt-tr-hover">
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon name={getAssetIcon(report.type)} size={16} style={{ color: "var(--ink-3)" }} />
                    <Link
                      href={`/assets/${report.id}`}
                      className="mono hover-underline"
                      style={{ color: "var(--nt-blue)", fontWeight: 600, textDecoration: "none" }}
                    >
                      {report.target}
                    </Link>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "var(--surface-3)",
                    color: "var(--ink-2)"
                  }}>
                    {report.type}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {report.scanStatus === "CLEAN" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ok)", fontWeight: 500 }}>
                      <span className="pulse-dot" style={{ background: "var(--ok)", boxShadow: "0 0 0 2px rgba(16,185,129,0.2)" }} />
                      Clean
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--sev-critical)", fontWeight: 500 }}>
                      <Icon name="alert" size={14} />
                      Vulnerable
                    </span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", color: "var(--ink-2)", whiteSpace: "nowrap" }}>
                  {formatDate(report.lastSeen)}
                </td>
                <td style={{ padding: "12px 16px", color: "var(--ink-3)", fontFamily: "monospace", fontSize: 11 }}>
                  {report.shortId}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 120 }}>
                    {/* Criticality Bar */}
                    <div style={{
                      display: "flex",
                      height: 6,
                      width: "100%",
                      borderRadius: 3,
                      overflow: "hidden",
                      background: "var(--surface-3)"
                    }}>
                      {report.vulnerabilityCount > 0 ? (
                        <>
                          {report.severityCounts.critical > 0 && <div style={{ width: `${(report.severityCounts.critical / report.vulnerabilityCount) * 100}%`, background: "var(--sev-critical)" }} title={`${report.severityCounts.critical} Critical`} />}
                          {report.severityCounts.high > 0 && <div style={{ width: `${(report.severityCounts.high / report.vulnerabilityCount) * 100}%`, background: "var(--sev-high)" }} title={`${report.severityCounts.high} High`} />}
                          {report.severityCounts.medium > 0 && <div style={{ width: `${(report.severityCounts.medium / report.vulnerabilityCount) * 100}%`, background: "#EAB308" }} title={`${report.severityCounts.medium} Medium`} />}
                          {report.severityCounts.low > 0 && <div style={{ width: `${(report.severityCounts.low / report.vulnerabilityCount) * 100}%`, background: "var(--sev-low)" }} title={`${report.severityCounts.low} Low`} />}
                          {report.severityCounts.info > 0 && <div style={{ width: `${(report.severityCounts.info / report.vulnerabilityCount) * 100}%`, background: "var(--ink-3)" }} title={`${report.severityCounts.info} Info`} />}
                        </>
                      ) : null}
                    </div>
                    {/* Compact text summary */}
                    <div style={{ fontSize: 10, color: "var(--ink-3)", display: "flex", gap: 4 }}>
                      {report.vulnerabilityCount > 0 ? (
                        <>
                          {report.severityCounts.critical > 0 && <span style={{ color: "var(--sev-critical)" }}>{report.severityCounts.critical} C</span>}
                          {report.severityCounts.high > 0 && <span style={{ color: "var(--sev-high)" }}>{report.severityCounts.high} H</span>}
                          {report.severityCounts.medium > 0 && <span style={{ color: "#EAB308" }}>{report.severityCounts.medium} M</span>}
                          {report.severityCounts.low > 0 && <span style={{ color: "var(--sev-low)" }}>{report.severityCounts.low} L</span>}
                          {report.severityCounts.info > 0 && <span>{report.severityCounts.info} I</span>}
                        </>
                      ) : (
                        <span>No findings</span>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <form action={deleteAsset}>
                    <input type="hidden" name="id" value={report.id} />
                    <button
                      type="submit"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--ink-3)",
                        cursor: "pointer",
                        padding: "6px",
                        borderRadius: 4,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.2s"
                      }}
                      className="hover-bg-surface-3"
                      title="Delete Asset"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {assetReports.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--ink-3)" }}>
                  No assets found in this project.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
