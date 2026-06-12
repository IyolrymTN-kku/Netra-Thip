import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { ResultsView } from "@/components/results/ResultsView";
import { Icon, type IconName } from "@/components/icons/Icon";
import Link from "next/link";
import { AssetType } from "@prisma/client";

function relativeAge(d: Date): string {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function getAssetIcon(type: AssetType): IconName {
  switch (type) {
    case "DOMAIN": return "globe";
    case "URL": return "link";
    case "IP": return "server";
    case "USER": return "user";
    default: return "target";
  }
}

interface AssetDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailsPage({ params }: AssetDetailsPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return redirect("/login");

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: { project: true }
  });

  if (!asset || asset.project.userId !== session.user.id) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
        <h2>Asset Not Found</h2>
        <Link href="/assets" style={{ color: "var(--nt-blue)" }}>Back to Assets</Link>
      </div>
    );
  }

  // Fetch all findings for this specific target
  const findings = await prisma.finding.findMany({
    where: {
      projectId: asset.projectId,
      target: asset.target,
    },
    include: {
      scanJob: { select: { toolName: true } },
    },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });

  const toolsUsed = Array.from(new Set(findings.map(f => f.scanJob.toolName)));
  const maxCvss = findings.length > 0 ? Math.max(...findings.map(f => f.cvss ?? 0)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Asset Header */}
      <div className="nt-card" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", overflow: "hidden" }}>

        {/* Background abstract element */}
        <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: "var(--nt-blue)", opacity: 0.05, borderRadius: "50%", filter: "blur(40px)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
           <Link href="/assets" className="hover-underline" style={{ color: "var(--ink-3)", textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
             <Icon name="chevronLeft" size={14} /> Back to Assets
           </Link>

           <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
             <div style={{ padding: 12, background: "var(--surface-2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <Icon name={getAssetIcon(asset.type)} size={24} style={{ color: "var(--nt-blue)" }} />
             </div>
             <h1 className="mono" style={{ fontSize: 26, margin: 0, color: "var(--ink)" }}>{asset.target}</h1>
           </div>

           <div style={{ fontSize: 12, color: "var(--ink-2)", display: "flex", gap: 24, background: "var(--surface-1)", padding: "10px 16px", borderRadius: 6, border: "1px solid var(--line)", flexWrap: "wrap" }}>
             <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
               <Icon name="layers" size={14} style={{ color: "var(--ink-3)" }} />
               <strong>Type:</strong> {asset.type.replace("_", " ")}
             </span>
             <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
               <Icon name="key" size={14} style={{ color: "var(--ink-3)" }} />
               <strong>Asset ID:</strong> <span className="mono">{asset.id.slice(0, 8)}...</span>
             </span>
             <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
               <Icon name="clock" size={14} style={{ color: "var(--ink-3)" }} />
               <strong>First Seen:</strong> {relativeAge(asset.createdAt)} ago
             </span>
             <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
               <Icon name="zap" size={14} style={{ color: "var(--ink-3)" }} />
               <strong>Scanned By:</strong> {toolsUsed.length > 0 ? toolsUsed.join(", ") : "None"}
             </span>
             {maxCvss > 0 && (
               <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                 <Icon name="alert" size={14} style={{ color: "var(--sev-critical)" }} />
                 <strong>Max Risk Score:</strong> <span className="mono">{maxCvss.toFixed(1)}</span>
               </span>
             )}
           </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, paddingTop: 36 }}>
           <Link href={`/scans/new?target=${encodeURIComponent(asset.target)}`} className="nt-button-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <Icon name="scan" size={16} /> Scan This Asset
           </Link>
        </div>
      </div>

      {/* Findings Results View */}
      {findings.length > 0 ? (
        <ResultsView findings={findings} mode="scan" />
      ) : (
        <div className="nt-card" style={{ padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ok)" }}>
            <Icon name="check" size={24} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 4px 0", color: "var(--ink)" }}>No Vulnerabilities Found</h3>
            <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13 }}>This asset appears to be clean based on current scan data.</p>
          </div>
        </div>
      )}
    </div>
  );
}
