"use client";

import { useId } from "react";

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}

export function Sparkline({
  data,
  color = "var(--nt-blue)",
  width = 92,
  height = 28,
  fill = true,
}: SparklineProps) {
  const id = useId();

  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map<[number, number]>((v, i) => [
    i * step,
    height - 2 - ((v - min) / span) * (height - 4),
  ]);
  const path = pts
    .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(" ");
  const fillPath = `${path} L${width},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={fillPath} fill={`url(#${id})`} />}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  );
}
