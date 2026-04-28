import { Icon, type IconName } from "@/components/icons/Icon";
import { Sparkline } from "./Sparkline";

export type DeltaKind =
  | "up-good"
  | "up-bad"
  | "down-good"
  | "down-bad"
  | "neutral";

export interface KpiCardProps {
  icon: IconName;
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaKind?: DeltaKind;
  accent: string;
  sparkData?: number[];
  sparkColor?: string;
  footer?: string;
}

function deltaColor(kind?: DeltaKind): string {
  switch (kind) {
    case "up-bad":
    case "down-bad":
      return "var(--sev-critical)";
    case "up-good":
    case "down-good":
      return "var(--ok)";
    default:
      return "var(--ink-3)";
  }
}

export function KpiCard({
  icon,
  label,
  value,
  unit,
  delta,
  deltaKind,
  accent,
  sparkData,
  sparkColor,
  footer,
}: KpiCardProps) {
  return (
    <div
      className="nt-card"
      style={{
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accent,
          opacity: 0.9,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.10em",
            color: "var(--ink-3)",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: `color-mix(in oklab, ${accent} 14%, transparent)`,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={icon} size={13} stroke={1.8} />
          </span>
          {label}
        </div>
        <button
          type="button"
          className="btn-ghost"
          style={{
            width: 22,
            height: 22,
            border: 0,
            borderRadius: 5,
            background: "transparent",
            color: "var(--ink-4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="More options"
        >
          <Icon name="more" size={14} />
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            minWidth: 0,
          }}
        >
          <span
            className="tnum"
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            {value}
          </span>
          {unit && (
            <span
              style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 500 }}
            >
              {unit}
            </span>
          )}
        </div>
        {sparkData && (
          <Sparkline data={sparkData} color={sparkColor ?? accent} />
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--ink-3)",
        }}
      >
        {delta && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: deltaColor(deltaKind),
              fontWeight: 600,
            }}
          >
            <Icon
              name={deltaKind?.startsWith("up") ? "trendUp" : "trendDown"}
              size={12}
              stroke={2}
            />
            {delta}
          </span>
        )}
        {footer && <span>{footer}</span>}
      </div>
    </div>
  );
}
