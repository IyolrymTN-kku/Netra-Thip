"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";

interface HeroProps {
  userName: string;
  activeScans?: number;
  lastSyncMinutesAgo?: number;
  onNewScan?: () => void;
  onImport?: () => void;
}

export function Hero({
  userName,
  activeScans = 0,
  lastSyncMinutesAgo,
  onNewScan,
  onImport,
}: HeroProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";

  return (
    <section
      className="dot-grid"
      style={{
        position: "relative",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -60,
          top: -60,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,102,255,0.18) 0%, rgba(0,102,255,0) 70%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: "var(--nt-blue)",
            marginBottom: 6,
          }}
        >
          <span className="pulse-dot" style={{ color: "var(--nt-blue)" }} />
          OPERATIONS · LIVE
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
            fontFamily: "var(--font-thai)",
          }}
        >
          สวัสดี {userName}.{" "}
          <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>
            Welcome back to Netra-Thip.
          </span>
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 12,
            color: "var(--ink-3)",
            marginTop: 6,
            flexWrap: "wrap",
          }}
        >
          <span>
            <span className="mono tnum">{activeScans}</span> active scans
          </span>
          <span
            style={{
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "var(--ink-4)",
            }}
          />
          {typeof lastSyncMinutesAgo === "number" && (
            <>
              <span>
                Last engine sync{" "}
                <span className="mono">{lastSyncMinutesAgo}m</span> ago
              </span>
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: "var(--ink-4)",
                }}
              />
            </>
          )}
          <span className="mono tnum" style={{ color: "var(--ink-2)" }}>
            {hh}:{mm}:<span style={{ color: "var(--nt-blue)" }}>{ss}</span> ICT
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          position: "relative",
          zIndex: 1,
        }}
      >
        <button type="button" className="btn btn-lg" onClick={onImport}>
          <Icon name="download" size={14} />
          Import findings
        </button>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onNewScan}
        >
          <Icon name="plus" size={14} stroke={2} />
          New Scan
          <span
            style={{
              marginLeft: 4,
              padding: "2px 5px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.18)",
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
            }}
          >
            N
          </span>
        </button>
      </div>
    </section>
  );
}
