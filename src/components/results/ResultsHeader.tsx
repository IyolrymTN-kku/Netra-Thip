import type { JobStatus, ScanJob } from "@prisma/client";
import { Icon, type IconName } from "@/components/icons/Icon";

interface ResultsHeaderProps {
  scanJob: Pick<
    ScanJob,
    "id" | "toolName" | "status" | "startedAt" | "completedAt" | "createdAt"
  >;
  findingCount: number;
  countLabel?: string;
}

interface BannerMeta {
  color: string;
  bg: string;
  icon: IconName;
  label: string;
}

const BANNER: Record<JobStatus, BannerMeta> = {
  PENDING: {
    color: "var(--ink-3)",
    bg: "var(--surface-3)",
    icon: "clock",
    label: "Queued — waiting for execution engine",
  },
  RUNNING: {
    color: "var(--nt-blue)",
    bg: "var(--nt-blue-50)",
    icon: "refresh",
    label: "Scanning in progress…",
  },
  COMPLETED: {
    color: "var(--ok)",
    bg: "rgba(16,185,129,0.10)",
    icon: "check",
    label: "Scan completed",
  },
  FAILED: {
    color: "var(--sev-critical)",
    bg: "rgba(225,29,72,0.10)",
    icon: "x",
    label: "Execution failed — check n8n logs",
  },
};

function formatDuration(start: Date | null, end: Date | null): string {
  if (!start) return "—";
  const ref = end ?? new Date();
  const ms = Math.max(0, ref.getTime() - start.getTime());
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

function formatRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ResultsHeader({
  scanJob,
  findingCount,
  countLabel = "findings",
}: ResultsHeaderProps) {
  const banner = BANNER[scanJob.status];
  const finishedAt = scanJob.completedAt ?? null;
  const startedAt = scanJob.startedAt ?? null;

  return (
    <section
      className="nt-card dot-grid"
      style={{
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -50,
          top: -50,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,102,255,0.16), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${banner.color}, color-mix(in oklab, ${banner.color} 55%, #000))`,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 24px color-mix(in oklab, ${banner.color} 35%, transparent)`,
            }}
          >
            <Icon name={banner.icon} size={22} stroke={2.6} />
          </span>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 700,
                fontFamily: "var(--font-thai)",
              }}
            >
              {scanJob.toolName}{" "}
              <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>
                · job <span className="mono">{scanJob.id.slice(-8)}</span>
              </span>
            </h2>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--ink-3)",
                marginTop: 2,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span>
                started{" "}
                <span className="mono">
                  {startedAt ? formatRelative(startedAt) : "—"}
                </span>
              </span>
              <span>·</span>
              <span>
                duration{" "}
                <span className="mono">
                  {formatDuration(startedAt, finishedAt)}
                </span>
              </span>
              <span>·</span>
              <span>
                <span className="mono tnum">{findingCount}</span> {countLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          background: banner.bg,
          color: banner.color,
          border: `1px solid color-mix(in oklab, ${banner.color} 30%, transparent)`,
          borderRadius: 10,
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        {scanJob.status === "RUNNING" ? (
          <span className="pulse-dot" style={{ color: banner.color }} />
        ) : (
          <Icon name={banner.icon} size={14} stroke={2.2} />
        )}
        <span style={{ flex: 1 }}>{banner.label}</span>
      </div>
    </section>
  );
}
