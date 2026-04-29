import type { FindingStatus } from "@prisma/client";
import { STATUS_META } from "./sev-meta";

interface StatusPillProps {
  status: FindingStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  const m = STATUS_META[status];
  return (
    <span
      className="chip"
      style={{
        background: m.bg,
        color: m.color,
        height: 20,
        fontWeight: 600,
      }}
    >
      {m.label}
    </span>
  );
}
