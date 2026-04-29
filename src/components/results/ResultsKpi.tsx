import { Icon, type IconName } from "@/components/icons/Icon";

interface ResultsKpiProps {
  label: string;
  value: number | string;
  color: string;
  icon: IconName;
}

export function ResultsKpi({ label, value, color, icon }: ResultsKpiProps) {
  return (
    <div
      className="nt-card"
      style={{ padding: "14px 16px", position: "relative", overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: color,
        }}
      />
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
            background: `color-mix(in oklab, ${color} 14%, transparent)`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={13} stroke={1.8} />
        </span>
        {label}
      </div>
      <div
        className="tnum"
        style={{
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginTop: 8,
        }}
      >
        {value}
      </div>
    </div>
  );
}
