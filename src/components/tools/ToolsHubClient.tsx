"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { DynamicForm, type FormValues } from "@/components/scans/DynamicForm";
import type { ToolDef } from "@/lib/tools/registry";
import { CAT_META } from "@/lib/tools/registry";

interface ToolsHubClientProps {
  tools: ToolDef[];
  projectId: string;
  savedConfigs: any[];
}

function pickTargetField(tool: ToolDef) {
  return tool.fields.find(
    (f) =>
      f.id === "target" ||
      f.id === "target_ip" ||
      f.id === "target_url" ||
      f.id === "target_domain" ||
      f.id === "target_api_url",
  );
}

export function ToolsHubClient({ tools, projectId, savedConfigs }: ToolsHubClientProps) {
  const router = useRouter();
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  
  // State for the form values of the currently selected tool
  const [values, setValues] = useState<FormValues>({});
  const [loading, setLoading] = useState(false);

  const selectedTool = useMemo(() => tools.find(t => t.id === selectedToolId), [tools, selectedToolId]);

  const openDrawer = (tool: ToolDef) => {
    // Initialize default values when opening the drawer
    const defaults: FormValues = {};
    for (const f of tool.fields) {
      if ("default" in f) {
        defaults[f.id] = (f as any).default;
      }
    }
    setValues(defaults);
    setSelectedToolId(tool.id);
  };

  const closeDrawer = () => {
    setSelectedToolId(null);
  };

  const setVal = (fieldId: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const configuredFields = useMemo(() => {
    if (!selectedTool) return {};
    const configured: Record<string, string> = {};
    const aiProvider = String(values.ai_provider || "openai");
    const aiConfig = savedConfigs.find((c: any) => c.provider === aiProvider);

    for (const f of selectedTool.fields) {
      if (f.id === "ai_api_key" && aiConfig) {
        configured[f.id] = "API Key";
      } else if ((f.id === "model" || f.id === "ai_model") && aiConfig?.metadata?.model) {
        configured[f.id] = aiConfig.metadata.model;
      } else if ((f.id === "base_url" || f.id === "ai_base_url") && aiConfig?.metadata?.baseUrl) {
        configured[f.id] = aiConfig.metadata.baseUrl;
      } else if (f.type === "secret" && !["model", "base_url", "ai_model", "ai_base_url"].includes(f.id)) {
        let provider = "";
        if (f.id.endsWith("_api_key")) provider = f.id.replace("_api_key", "");
        else provider = `${selectedTool.id}_${f.id}`;
        
        const saved = savedConfigs.find((c: any) => c.provider === provider);
        if (saved) {
          configured[f.id] = "API Key";
        }
      }
    }
    return configured;
  }, [selectedTool, savedConfigs, values.ai_provider]);

  const requiredOk = useMemo(() => {
    if (!selectedTool) return false;
    return selectedTool.fields
      .filter((f) => f.required && !configuredFields[f.id])
      .every((f) => {
        const v = values[f.id] ?? ("default" in f ? (f as any).default : undefined);
        return v !== undefined && v !== null && v !== "";
      });
  }, [selectedTool, values, configuredFields]);

  const handleLaunch = async () => {
    if (!selectedTool || !requiredOk || loading) return;
    setLoading(true);

    try {
      const parameters: FormValues = {};
      const secrets: Record<string, string> = {};

      for (const f of selectedTool.fields) {
        if (f.type === "secret") {
          secrets[f.id] = (values[f.id] as string) || "";
        } else {
          parameters[f.id] = values[f.id];
        }
      }

      const targetField = pickTargetField(selectedTool);
      let targetValue = "";
      let assetType: "DOMAIN" | "IP" | "URL" = "DOMAIN";
      if (targetField) {
        targetValue = String(values[targetField.id] || "");
        if (targetField.type === "ip") assetType = "IP";
        else if (targetField.type === "url") assetType = "URL";
      }

      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: selectedTool.id,
          projectId,
          target: targetValue,
          assetType,
          parameters,
          secrets,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to launch scan");
      }

      router.push("/scans");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  if (tools.length === 0) {
    return (
      <div style={{ padding: 32, color: "var(--ink-3)", fontStyle: "italic" }}>
        No tools available in this category yet.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Grid of Tools (App Store Style) */}
      <div style={{ 
        padding: "0 32px 60px", 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", 
        gap: 24,
        overflow: "auto",
        maxWidth: 1600,
        margin: "0 auto",
        width: "100%"
      }}>
        {tools.map(tool => {
          const catMeta = CAT_META[tool.cat];
          return (
            <div 
              key={tool.id} 
              className="nt-card" 
              style={{ 
                display: "flex", 
                flexDirection: "column",
                cursor: "default",
                transition: "transform 0.2s, box-shadow 0.2s, background 0.2s",
                position: "relative",
                overflow: "hidden",
                padding: "24px",
                background: "rgba(30, 41, 59, 0.4)", // Glassmorphism base
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                e.currentTarget.style.background = "rgba(30, 41, 59, 0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                e.currentTarget.style.background = "rgba(30, 41, 59, 0.4)";
              }}
            >
              {/* Top gradient strip based on tool color */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: tool.color }} />
              
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                <div style={{ 
                  width: 52, 
                  height: 52, 
                  borderRadius: 14, 
                  background: `color-mix(in srgb, ${tool.color} 15%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${tool.color} 30%, transparent)`,
                  color: tool.color,
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {tool.glyph}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{tool.name}</h3>
                  <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4, fontWeight: 500 }}>{tool.tagline}</div>
                </div>
              </div>

              {tool.features && tool.features.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {tool.features.map(feat => (
                    <span key={feat} style={{ 
                      fontSize: 11, 
                      padding: "3px 8px", 
                      borderRadius: 6, 
                      background: "var(--surface-3)", 
                      color: "var(--ink-2)",
                      border: "1px solid var(--line)",
                      fontWeight: 500
                    }}>
                      {feat}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, flex: 1, marginBottom: 24 }}>
                {tool.desc}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: catMeta.color, boxShadow: `0 0 8px ${catMeta.color}` }} />
                  {catMeta.label}
                  <span style={{ color: "var(--line)" }}>|</span>
                  <Icon name="clock" size={13} style={{ opacity: 0.7 }} />
                  {tool.runtime}
                </div>

                <button className="nt-button-primary" style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8 }} onClick={() => openDrawer(tool)}>
                  Launch <Icon name="arrowRight" size={14} style={{ marginLeft: 6 }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Drawer for Execution */}
      <div 
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          background: "var(--surface)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
          transform: selectedToolId ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          zIndex: 50
        }}
      >
        {selectedTool && (
          <>
            {/* Drawer Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "var(--surface-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${selectedTool.color} 15%, transparent)`, color: selectedTool.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>
                  {selectedTool.glyph}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{selectedTool.name}</h2>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{selectedTool.tagline}</div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={closeDrawer}
                style={{ background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer", padding: 4 }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Drawer Body (Form) */}
            <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
              <DynamicForm tool={selectedTool} values={values} onChange={setVal} configuredFields={configuredFields} />
            </div>

            {/* Drawer Footer (Action) */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--line)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="lock" size={12} /> BYOK Secure
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button type="button" className="btn" onClick={closeDrawer} disabled={loading}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleLaunch} 
                  disabled={!requiredOk || loading}
                  style={{ opacity: (!requiredOk || loading) ? 0.5 : 1, cursor: (!requiredOk || loading) ? "not-allowed" : "pointer" }}
                >
                  {loading ? (
                    <>
                      <Icon name="refresh" size={14} className="spin" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Icon name="play" size={12} stroke={2.4} />
                      Run scan
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
