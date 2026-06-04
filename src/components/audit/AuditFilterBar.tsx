"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "USER_LOGIN", label: "Login" },
  { value: "USER_LOGIN_FAILED", label: "Login Failed" },
  { value: "SCAN_CREATED", label: "Scan Created" },
  { value: "SCAN_COMPLETED", label: "Scan Completed" },
  { value: "FINDING_STATUS_CHANGED", label: "Finding Changed" },
  { value: "API_KEY_CREATED", label: "API Key Created" },
  { value: "API_KEY_DELETED", label: "API Key Deleted" },
  { value: "SETTINGS_UPDATED", label: "Settings Updated" },
];

const DATE_PRESETS: { label: string; value: string }[] = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "All Time", value: "all" },
];

interface AuditFilterBarProps {
  selectedActions: string[];
  onActionsChange: (actions: string[]) => void;
  datePreset: string;
  onDatePresetChange: (preset: string) => void;
}

export function AuditFilterBar({
  selectedActions,
  onActionsChange,
  datePreset,
  onDatePresetChange,
}: AuditFilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleAction = (action: string) => {
    if (selectedActions.includes(action)) {
      onActionsChange(selectedActions.filter((a) => a !== action));
    } else {
      onActionsChange([...selectedActions, action]);
    }
  };

  return (
    <div
      className="nt-card"
      style={{
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {/* Date presets */}
        <div style={{ display: "flex", gap: 4 }}>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className="nt-chip-opt"
              data-on={datePreset === p.value ? "true" : undefined}
              onClick={() => onDatePresetChange(p.value)}
              style={{ height: 26, fontSize: 11.5 }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: "var(--line)", margin: "0 4px" }} />

        {/* Filter toggle */}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setExpanded(!expanded)}
          style={{
            gap: 5,
            color: selectedActions.length > 0 ? "var(--nt-blue)" : undefined,
            borderColor: selectedActions.length > 0 ? "var(--nt-blue)" : undefined,
          }}
        >
          <Icon name="filter" size={12} />
          Filter
          {selectedActions.length > 0 && (
            <span
              style={{
                background: "var(--nt-blue)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 999,
                padding: "0 5px",
                lineHeight: "16px",
              }}
            >
              {selectedActions.length}
            </span>
          )}
        </button>

        {selectedActions.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onActionsChange([])}
            style={{ fontSize: 11, color: "var(--ink-3)" }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Action chips (expanded) */}
      {expanded && (
        <div
          className="nt-fade-in"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            paddingTop: 4,
            borderTop: "1px solid var(--line)",
            paddingBottom: 2,
          }}
        >
          {ACTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="nt-chip-opt"
              data-on={selectedActions.includes(opt.value) ? "true" : undefined}
              onClick={() => toggleAction(opt.value)}
              style={{ height: 26, fontSize: 11 }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
