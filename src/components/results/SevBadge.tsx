import type { Severity } from "@prisma/client";
import { SEV_META } from "./sev-meta";

interface SevBadgeProps {
  severity: Severity;
}

export function SevBadge({ severity }: SevBadgeProps) {
  const m = SEV_META[severity];
  return (
    <span
      className="chip"
      style={{
        background: m.bg,
        color: m.color,
        height: 20,
        letterSpacing: "0.06em",
      }}
    >
      <span className="chip-dot" style={{ background: "currentColor" }} />
      {severity}
    </span>
  );
}
