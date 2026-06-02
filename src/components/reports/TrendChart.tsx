"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface TrendData {
  week: string;
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  INFO: number;
}

interface TrendChartProps {
  data: TrendData[];
}

// Custom tooltip to match design system
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="nt-card p-3 shadow-md border-[var(--line-2)] min-w-[140px]">
        <p className="text-[11.5px] font-bold text-[var(--ink-2)] mb-2 border-b border-[var(--line)] pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center text-[12px] my-1">
            <span style={{ color: entry.color }} className="font-semibold">{entry.name}</span>
            <span className="tnum font-bold ml-4">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function TrendChart({ data }: TrendChartProps) {
  // If data is empty, pad it with some empty weeks for rendering visually
  const chartData = useMemo(() => {
    if (data.length > 0) return data;
    const now = new Date();
    return Array.from({ length: 4 }).map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (3 - i) * 7);
      const week = `W${Math.ceil((((d.getTime() - new Date(Date.UTC(d.getUTCFullYear(),0,1)).getTime()) / 86400000) + 1)/7).toString().padStart(2, '0')}`;
      return { week, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    });
  }, [data]);

  return (
    <div className="nt-card p-5 h-full flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-[13.5px] font-bold text-[var(--ink)]">Vulnerability Trend</h3>
          <p className="text-[11.5px] text-[var(--ink-4)] mt-1">Findings grouped by week</p>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            barSize={24}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
            <XAxis 
              dataKey="week" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--ink-4)", fontSize: 11 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--ink-4)", fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--hover)" }} />
            <Legend 
              wrapperStyle={{ fontSize: '11px', fontWeight: 500, color: 'var(--ink-3)', paddingTop: '16px' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="CRITICAL" stackId="a" fill="var(--sev-critical)" name="Critical" radius={[0, 0, 4, 4]} />
            <Bar dataKey="HIGH" stackId="a" fill="var(--sev-high)" name="High" />
            <Bar dataKey="MEDIUM" stackId="a" fill="var(--sev-medium)" name="Medium" />
            <Bar dataKey="LOW" stackId="a" fill="var(--sev-low)" name="Low" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
