"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { useRouter } from "next/navigation";

interface SavedKey {
  provider: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    model?: string;
    baseUrl?: string;
  } | null;
}

interface Props {
  initialKeys: any[];
}

const PROVIDERS = [
  { id: "openai", name: "OpenAI", icon: "sparkles" },
  { id: "nmap", name: "Nmap Scripting Engine", icon: "command" }, // Placeholder for generic tools
  { id: "shodan", name: "Shodan", icon: "globe" }
];

export function AIProviderSettings({ initialKeys }: Props) {
  const router = useRouter();
  const [keys, setKeys] = useState<SavedKey[]>(initialKeys as SavedKey[]);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  // Form State
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startEdit = (providerId: string) => {
    setEditingProvider(providerId);
    setApiKey(""); // Don't show existing key
    const existing = keys.find(k => k.provider === providerId);
    setModel(existing?.metadata?.model || "");
    setBaseUrl(existing?.metadata?.baseUrl || "");
    setErrorMsg(null);
  };

  const cancelEdit = () => {
    setEditingProvider(null);
  };

  const handleSave = async (providerId: string) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerId,
          apiKey: apiKey.trim(),
          model: model.trim(),
          baseUrl: baseUrl.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(()=>null);
        throw new Error(data?.error || "Failed to save configuration");
      }

      // Optimistically update local state so we don't have to reload entirely
      const existingIdx = keys.findIndex(k => k.provider === providerId);
      const newKeyObj = {
        provider: providerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { model: model.trim(), baseUrl: baseUrl.trim() }
      };

      if (existingIdx >= 0) {
        const next = [...keys];
        next[existingIdx] = { ...next[existingIdx], updatedAt: new Date().toISOString(), metadata: newKeyObj.metadata };
        setKeys(next);
      } else {
        setKeys([...keys, newKeyObj]);
      }

      setEditingProvider(null);
      router.refresh(); // Refresh to ensure server state is sync'd
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="nt-card" style={{ padding: 0, overflow: "hidden" }}>
      {PROVIDERS.map((provider, i) => {
        const saved = keys.find(k => k.provider === provider.id);
        const isEditing = editingProvider === provider.id;

        return (
          <div key={provider.id} style={{ borderBottom: i < PROVIDERS.length - 1 ? "1px solid var(--line)" : "none" }}>
            {/* Display Row */}
            <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: isEditing ? "var(--surface-2)" : "transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
                  <Icon name={provider.icon as any} size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{provider.name}</h3>
                  <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    {saved ? (
                      <>
                        <span style={{ color: "var(--ok)", display: "flex", alignItems: "center", gap: 4 }}><Icon name="check" size={12} /> Configured</span>
                        {saved.metadata?.model && (
                          <>
                            <span style={{color: "var(--line)"}}>|</span>
                            <span className="mono" style={{ fontSize: 11 }}>Model: {saved.metadata.model}</span>
                          </>
                        )}
                      </>
                    ) : "Not Configured"}
                  </div>
                </div>
              </div>
              
              {!isEditing && (
                <button className="nt-button-secondary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => startEdit(provider.id)}>
                  {saved ? "Edit" : "Configure"}
                </button>
              )}
            </div>

            {/* Edit Form */}
            {isEditing && (
              <div style={{ padding: "0 24px 24px 24px", background: "var(--surface-2)", animation: "fadeIn 0.2s ease" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, background: "var(--surface)", padding: 20, borderRadius: 8, border: "1px solid var(--line)" }}>
                  
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
                      API Key <span style={{ color: "var(--err)" }}>*</span>
                    </label>
                    <input 
                      type="password"
                      className="nt-input"
                      placeholder={saved ? "•••••••••••••••• (Leave blank to keep current key)" : `Enter ${provider.name} API Key`}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                    />
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, display: "flex", gap: 4, alignItems: "center" }}>
                      <Icon name="lock" size={12} /> Keys are encrypted securely and never exposed.
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
                        Model Name (Optional)
                      </label>
                      <input 
                        type="text"
                        className="nt-input"
                        placeholder="e.g. gpt-4o, claude-3-opus"
                        value={model}
                        onChange={e => setModel(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
                        Base URL (Optional)
                      </label>
                      <input 
                        type="text"
                        className="nt-input"
                        placeholder="Custom endpoint override"
                        value={baseUrl}
                        onChange={e => setBaseUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div style={{ color: "var(--err)", fontSize: 13, background: "color-mix(in srgb, var(--err) 10%, transparent)", padding: "8px 12px", borderRadius: 6 }}>
                      {errorMsg}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                    <button className="nt-button-secondary" disabled={saving} onClick={cancelEdit}>Cancel</button>
                    <button className="nt-button-primary" disabled={saving || (!saved && !apiKey.trim())} onClick={() => handleSave(provider.id)}>
                      {saving ? "Saving..." : "Save Configuration"}
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
