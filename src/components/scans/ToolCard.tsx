"use client";

import { Icon } from "@/components/icons/Icon";
import { CAT_META, type ToolDef } from "@/lib/tools/registry";

interface ToolCardProps {
  tool: ToolDef;
  selected: boolean;
  onClick: () => void;
}

export function ToolCard({ tool, selected, onClick }: ToolCardProps) {
  const meta = CAT_META[tool.cat];
  return (
    <button
      type="button"
      onClick={onClick}
      className="nt-card"
      style={{
        textAlign: "left",
        cursor: "pointer",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        overflow: "hidden",
        border: selected ? `1.5px solid ${tool.color}` : "1px solid var(--line)",
        background: selected
          ? `color-mix(in oklab, ${tool.color} 6%, var(--surface))`
          : "var(--surface)",
        boxShadow: selected
          ? `0 0 0 3px color-mix(in oklab, ${tool.color} 18%, transparent), var(--shadow-sm)`
          : "var(--shadow-sm)",
        transition: "all 180ms cubic-bezier(.2,.7,.2,1)",
        transform: selected ? "translateY(-1px)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: `linear-gradient(135deg, ${tool.color}, color-mix(in oklab, ${tool.color} 60%, #000))`,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            boxShadow: `0 4px 12px color-mix(in oklab, ${tool.color} 35%, transparent)`,
          }}
        >
          {tool.glyph}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}
            >
              {tool.name}
            </span>
            <span
              className="chip"
              style={{
                height: 16,
                padding: "0 6px",
                fontSize: 9.5,
                letterSpacing: "0.06em",
                background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                color: meta.color,
              }}
            >
              {meta.label}
            </span>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
            {tool.category} · <span className="mono">{tool.runtime}</span>
          </div>
        </div>
        {selected && (
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: tool.color,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="check" size={11} stroke={2.6} />
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--ink-3)",
          lineHeight: 1.45,
        }}
      >
        {tool.tagline}
      </div>
    </button>
  );
}
