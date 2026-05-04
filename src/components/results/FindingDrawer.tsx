"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FindingStatus } from "@prisma/client";
import { Icon } from "@/components/icons/Icon";
import { SevBadge } from "./SevBadge";
import { StatusPill } from "./StatusPill";
import type { FindingRow } from "./types";

interface FindingDrawerProps {
  finding: FindingRow;
  onClose: () => void;
}

type Tab = "description" | "remediation" | "status";

const TABS: { id: Tab; label: string; sparkle?: boolean }[] = [
  { id: "description", label: "Description" },
  { id: "remediation", label: "AI Remediation", sparkle: true },
  { id: "status", label: "Status" },
];

const STATUS_OPTIONS: FindingStatus[] = ["OPEN", "RESOLVED", "IGNORED"];

export function FindingDrawer({ finding, onClose }: FindingDrawerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("description");
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    finding.status,
    (_prev, next: FindingStatus) => next,
  );
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function changeStatus(next: FindingStatus) {
    if (next === optimisticStatus || pending) return;
    setErrorMsg(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      const res = await fetch(`/api/findings/${finding.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setErrorMsg(body?.error ?? `update failed (${res.status})`);
        // Throw inside the transition so useOptimistic auto-reverts.
        throw new Error("revert");
      }
      router.refresh();
    });
  }

  return (
    <>
      <div
        className="nt-fade-in"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10,22,40,0.34)",
          backdropFilter: "blur(2px)",
          zIndex: 100,
        }}
      />
      <aside
        className="nt-slide-right"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(580px, 92vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "-12px 0 40px rgba(10,22,40,0.18)",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <SevBadge severity={finding.severity} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              {finding.title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                marginTop: 4,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span className="mono">{finding.id.slice(-8)}</span>
              <span>·</span>
              <span>{finding.scanJob.toolName}</span>
              <span>·</span>
              <span className="mono">{finding.target}</span>
              {finding.cvss != null && (
                <>
                  <span>·</span>
                  <span className="mono">CVSS {finding.cvss.toFixed(1)}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              border: 0,
              background: "transparent",
              color: "var(--ink-3)",
              cursor: "pointer",
              borderRadius: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div
          style={{
            padding: "0 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            gap: 0,
            overflowX: "auto",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                border: 0,
                background: "transparent",
                padding: "12px 14px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: tab === t.id ? 600 : 500,
                color: tab === t.id ? "var(--nt-blue)" : "var(--ink-3)",
                borderBottom: `2px solid ${tab === t.id ? "var(--nt-blue)" : "transparent"}`,
                marginBottom: -1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {t.sparkle && <Icon name="sparkles" size={12} />}
              {t.label}
            </button>
          ))}
        </div>

        <div
          style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}
          key={tab}
        >
          <div className="nt-fade-in">
            {tab === "description" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {finding.description || "— no description provided —"}
                </div>
              </div>
            )}

            {tab === "remediation" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {finding.remediation ? (
                  <>
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background:
                          "linear-gradient(135deg, color-mix(in oklab, var(--nt-blue) 8%, var(--surface)) 0%, var(--surface) 100%)",
                        border:
                          "1px solid color-mix(in oklab, var(--nt-blue) 25%, var(--line))",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background:
                            "linear-gradient(135deg, var(--nt-blue), var(--nt-cyan))",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name="sparkles" size={14} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          AI-suggested remediation
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: "var(--ink-3)",
                          }}
                        >
                          generated by configured project AI provider
                        </div>
                      </div>
                    </div>
                    <ol
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {finding.remediation
                        .split("\n")
                        .filter(Boolean)
                        .map((step, i) => {
                          const m = step.match(/^(\d+)\.\s*(.*)$/);
                          const n = m ? m[1] : i + 1;
                          const txt = m ? m[2] : step;
                          return (
                            <li
                              key={i}
                              style={{
                                display: "flex",
                                gap: 10,
                                padding: "10px 12px",
                                background: "var(--surface-2)",
                                border: "1px solid var(--line)",
                                borderRadius: 8,
                              }}
                            >
                              <span
                                style={{
                                  flexShrink: 0,
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  background: "var(--nt-blue-50)",
                                  color: "var(--nt-blue)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                {n}
                              </span>
                              <span
                                style={{
                                  fontSize: 12.5,
                                  lineHeight: 1.55,
                                  color: "var(--ink-2)",
                                }}
                              >
                                {txt}
                              </span>
                            </li>
                          );
                        })}
                    </ol>
                  </>
                ) : (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      fontSize: 12.5,
                      color: "var(--ink-3)",
                      background: "var(--surface-2)",
                      border: "1px dashed var(--line)",
                      borderRadius: 8,
                    }}
                  >
                    No remediation steps were ingested for this finding.
                  </div>
                )}
              </div>
            )}

            {tab === "status" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                  }}
                >
                  First seen{" "}
                  <span className="mono" style={{ color: "var(--ink-2)" }}>
                    {new Date(finding.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Update status
                  </div>
                  {errorMsg && (
                    <div
                      role="alert"
                      style={{
                        fontSize: 11.5,
                        color: "var(--err)",
                        background: "rgba(239,68,68,0.10)",
                        border: "1px solid rgba(239,68,68,0.18)",
                        padding: "8px 10px",
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      {errorMsg}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => {
                      const checked = optimisticStatus === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => changeStatus(s)}
                          disabled={pending}
                          aria-pressed={checked}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            background: checked
                              ? "var(--nt-blue-50)"
                              : "var(--surface-2)",
                            border: `1px solid ${checked ? "var(--nt-blue)" : "var(--line)"}`,
                            borderRadius: 8,
                            cursor: pending ? "wait" : "pointer",
                            textAlign: "left",
                            font: "inherit",
                            transition: "all 140ms ease",
                            opacity: pending && !checked ? 0.6 : 1,
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              border: `2px solid ${checked ? "var(--nt-blue)" : "var(--line-2)"}`,
                              background: checked
                                ? "var(--nt-blue)"
                                : "transparent",
                              boxShadow: checked
                                ? "inset 0 0 0 3px var(--surface)"
                                : "none",
                              flexShrink: 0,
                            }}
                          />
                          <StatusPill status={s} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
