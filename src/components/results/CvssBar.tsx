import type { Severity } from "@prisma/client";
import { SEV_META } from "./sev-meta";

interface CvssBarProps {
  score: number | null | undefined;
  severity?: Severity;
}

export function CvssBar({ score, severity }: CvssBarProps) {
  if (score == null) {
    return <span style={{ color: "var(--ink-4)" }}>—</span>;
  }
  const pct = Math.min(100, (score / 10) * 100);
  const color = severity ? SEV_META[severity].color : "var(--nt-blue)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 50,
          height: 4,
          borderRadius: 2,
          background: "var(--surface-3)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <span
        className="mono tnum"
        style={{ fontSize: 11.5, fontWeight: 600 }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}
