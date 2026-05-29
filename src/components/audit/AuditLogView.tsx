"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { AuditFilterBar } from "./AuditFilterBar";

/* ── Action → visual mapping ── */
const ACTION_META: Record<
  string,
  { icon: IconName; color: string; label: string }
> = {
  USER_LOGIN: { icon: "user", color: "var(--ok)", label: "Login" },
  USER_LOGIN_FAILED: {
    icon: "alert",
    color: "var(--sev-critical)",
    label: "Login Failed",
  },
  SCAN_CREATED: { icon: "scan", color: "var(--nt-blue)", label: "Scan Created" },
  SCAN_COMPLETED: {
    icon: "check",
    color: "var(--ok)",
    label: "Scan Completed",
  },
  FINDING_STATUS_CHANGED: {
    icon: "bug",
    color: "var(--sev-high)",
    label: "Finding Changed",
  },
  API_KEY_CREATED: {
    icon: "key",
    color: "var(--nt-cyan)",
    label: "API Key Created",
  },
  API_KEY_DELETED: {
    icon: "x",
    color: "var(--sev-critical)",
    label: "API Key Deleted",
  },
  SETTINGS_UPDATED: {
    icon: "settings",
    color: "var(--ink-3)",
    label: "Settings Updated",
  },
};

interface AuditEntry {
  id: string;
  action: string;
  userId: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  } | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function datePresetToRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  switch (preset) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString() };
    }
    case "7d": {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: start.toISOString() };
    }
    case "30d": {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: start.toISOString() };
    }
    default:
      return {};
  }
}

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "50");
        if (selectedActions.length > 0) {
          params.set("action", selectedActions.join(","));
        }
        const range = datePresetToRange(datePreset);
        if (range.from) params.set("from", range.from);
        if (range.to) params.set("to", range.to);

        const res = await fetch(`/api/audit?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error("[audit] fetch failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedActions, datePreset],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  return (
    <div
      className="nt-stagger"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {/* Filter bar */}
      <AuditFilterBar
        selectedActions={selectedActions}
        onActionsChange={(a) => setSelectedActions(a)}
        datePreset={datePreset}
        onDatePresetChange={(p) => setDatePreset(p)}
      />

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 12 }}>
        <div
          className="nt-card"
          style={{
            flex: 1,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--nt-blue-50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--nt-blue)",
            }}
          >
            <Icon name="clipboard" size={16} />
          </div>
          <div>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
              {pagination.total}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
              Total Events
            </div>
          </div>
        </div>

        <div
          className="nt-card"
          style={{
            flex: 1,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ok)",
            }}
          >
            <Icon name="user" size={16} />
          </div>
          <div>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
              {new Set(logs.filter((l) => l.userId).map((l) => l.userId)).size}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
              Active Users
            </div>
          </div>
        </div>

        <div
          className="nt-card"
          style={{
            flex: 1,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(249, 115, 22, 0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--sev-high)",
            }}
          >
            <Icon name="activity" size={16} />
          </div>
          <div>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
              {pagination.totalPages}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
              Pages
            </div>
          </div>
        </div>
      </div>

      {/* Event log table */}
      <div className="nt-card" style={{ overflow: "hidden" }}>
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px 2fr 1.2fr 1fr 0.8fr 0.8fr",
            gap: 8,
            padding: "10px 18px",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--line)",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "var(--ink-4)",
            textTransform: "uppercase",
          }}
        >
          <span />
          <span>Event</span>
          <span>User</span>
          <span>Target</span>
          <span>IP Address</span>
          <span style={{ textAlign: "right" }}>Time</span>
        </div>

        {/* Loading */}
        {loading && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--ink-3)",
              fontSize: 13,
            }}
          >
            <Icon
              name="refresh"
              size={20}
              className="animate-spin"
              style={{ marginInline: "auto", marginBottom: 8 }}
            />
            Loading audit logs…
          </div>
        )}

        {/* Empty */}
        {!loading && logs.length === 0 && (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: "var(--ink-3)",
            }}
          >
            <Icon
              name="clipboard"
              size={36}
              style={{
                marginInline: "auto",
                marginBottom: 12,
                color: "var(--ink-4)",
              }}
            />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)" }}>
              No audit events found
            </div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>
              Adjust your filters or check back later.
            </div>
          </div>
        )}

        {/* Rows */}
        {!loading &&
          logs.map((log, i) => {
            const meta = ACTION_META[log.action] ?? {
              icon: "activity" as IconName,
              color: "var(--ink-3)",
              label: log.action,
            };
            const isExpanded = expandedId === log.id;

            return (
              <div key={log.id}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : log.id)
                  }
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 2fr 1.2fr 1fr 0.8fr 0.8fr",
                    gap: 8,
                    padding: "12px 18px",
                    borderBottom:
                      i < logs.length - 1 ? "1px solid var(--line)" : "none",
                    background: isExpanded
                      ? "var(--surface-2)"
                      : "transparent",
                    width: "100%",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    alignItems: "center",
                    fontSize: 12.5,
                    color: "var(--ink)",
                    transition: "background 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded)
                      e.currentTarget.style.background = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: meta.color,
                    }}
                  >
                    <Icon name={meta.icon} size={14} />
                  </div>

                  {/* Event */}
                  <div>
                    <span style={{ fontWeight: 600 }}>{meta.label}</span>
                    {log.targetType && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 10.5,
                          color: "var(--ink-4)",
                          fontWeight: 500,
                        }}
                      >
                        · {log.targetType}
                      </span>
                    )}
                  </div>

                  {/* User */}
                  <div style={{ minWidth: 0 }}>
                    {log.user ? (
                      <div>
                        <div
                          style={{
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {log.user.name ?? log.user.email}
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: "var(--ink-4)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {log.user.role}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--ink-4)", fontStyle: "italic" }}>
                        System
                      </span>
                    )}
                  </div>

                  {/* Target */}
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.targetId
                      ? `${log.targetId.slice(0, 12)}…`
                      : "—"}
                  </div>

                  {/* IP */}
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                    {log.ipAddress ?? "—"}
                  </div>

                  {/* Time */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
                      {relativeTime(log.createdAt)}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 1 }}
                    >
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </div>
                </button>

                {/* Expanded metadata */}
                {isExpanded && log.metadata && (
                  <div
                    className="nt-fade-in"
                    style={{
                      padding: "12px 18px 16px 62px",
                      background: "var(--surface-2)",
                      borderBottom:
                        i < logs.length - 1
                          ? "1px solid var(--line)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: "var(--ink-4)",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Metadata
                    </div>
                    <pre
                      className="mono"
                      style={{
                        fontSize: 11.5,
                        lineHeight: 1.6,
                        color: "var(--ink-2)",
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        margin: 0,
                        overflow: "auto",
                        maxHeight: 200,
                      }}
                    >
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchLogs(pagination.page - 1)}
            style={{ opacity: pagination.page <= 1 ? 0.4 : 1 }}
          >
            <Icon name="chevronLeft" size={12} />
            Previous
          </button>
          <span
            className="tnum"
            style={{ fontSize: 12, color: "var(--ink-3)", padding: "0 8px" }}
          >
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchLogs(pagination.page + 1)}
            style={{
              opacity: pagination.page >= pagination.totalPages ? 0.4 : 1,
            }}
          >
            Next
            <Icon name="chevronRight" size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
