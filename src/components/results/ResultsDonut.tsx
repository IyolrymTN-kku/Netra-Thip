interface DonutSlice {
  color: string;
  value: number;
}

interface ResultsDonutProps {
  data: DonutSlice[];
  total: number;
}

export function ResultsDonut({ data, total }: ResultsDonutProps) {
  const cx = 70;
  const cy = 70;
  const r = 50;
  const stroke = 14;
  const C = 2 * Math.PI * r;

  let acc = 0;
  const segments = data.map((d, i) => {
    const len = total ? (d.value / total) * C : 0;
    const off = -acc;
    acc += len;
    return (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={d.color}
        strokeWidth={stroke}
        strokeDasharray={`${len} ${C - len}`}
        strokeDashoffset={off}
      />
    );
  });

  return (
    <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
      <svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        {segments}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="tnum"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          {total}
        </div>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "var(--ink-3)",
          }}
        >
          FINDINGS
        </div>
      </div>
    </div>
  );
}
