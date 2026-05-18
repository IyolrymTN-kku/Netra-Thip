"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { TOOLS, type FieldConfig, type ToolDef } from "@/lib/tools/registry";
import { DynamicForm, type FileMeta, type FormValues } from "./DynamicForm";
import { ToolCard } from "./ToolCard";

interface NewScanLauncherProps {
  projectId: string;
}

type AssetType = "DOMAIN" | "IP" | "URL";

interface TargetDescriptor {
  fieldId: string;
  assetType: AssetType;
}

interface UploadedFileRef {
  path: string;
  originalName: string;
  size: number;
}

type SubmitPhase = "idle" | "uploading" | "queueing";

// Pick the field that represents the scan target. Priority order — IP > URL > domain text.
function pickTargetField(tool: ToolDef): TargetDescriptor | null {
  const ip = tool.fields.find(
    (f) => f.type === "ip" || f.id === "target_ip",
  );
  if (ip) return { fieldId: ip.id, assetType: "IP" };
  const url = tool.fields.find(
    (f) => f.type === "url" || f.id === "target_url" || f.id === "target_api_url",
  );
  if (url) return { fieldId: url.id, assetType: "URL" };
  const text = tool.fields.find((f) => f.id === "target");
  if (text) return { fieldId: text.id, assetType: "DOMAIN" };
  return null;
}

function isFileFieldId(tool: ToolDef, fieldId: string): boolean {
  return tool.fields.some(
    (f: FieldConfig) => f.id === fieldId && f.type === "file",
  );
}

// Build the parameters object that hits POST /api/scans.
// - Secret fields are passed through to the server, which encrypts them via (Last Version not use fix later)
//   AES-256-GCM into the ApiKey table and strips them from `parameters` server-side. (Last Version not use fix later)
// - File fields are replaced with the upload ref returned by /api/scans/upload.(Last Version not use fix later)

// [แก้ไขแล้ว]: ดึงค่าจาก tool.fields เพื่อป้องกันค่า default ตกหล่น
function buildParameters(
  tool: ToolDef,
  values: FormValues,
  fileRefs: Record<string, UploadedFileRef>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  
  // วนลูปตาม Field ที่ Tool กำหนดไว้
  for (const field of tool.fields) {
    if (field.type === "file") continue; // File จัดการแยกต่างหากแล้ว

    // ดึงค่าจาก values ถ้าไม่มีให้ดึง default
    const value = values[field.id] ?? ("default" in field ? field.default : undefined);

    if (value === undefined || value === null || value === "") continue;

    out[field.id] = value;
  }

  // เอา File Refs มารวม
  for (const [fieldId, ref] of Object.entries(fileRefs)) {
    out[fieldId] = ref;
  }
  
  return out;
}

async function uploadOneFile(meta: FileMeta): Promise<UploadedFileRef> {
  const form = new FormData();
  form.append("file", meta.file, meta.name);
  const res = await fetch("/api/scans/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? `upload failed (${res.status})`);
  }
  return (await res.json()) as UploadedFileRef;
}

async function uploadFileFields(
  tool: ToolDef,
  values: FormValues,
): Promise<Record<string, UploadedFileRef>> {
  const refs: Record<string, UploadedFileRef> = {};
  for (const f of tool.fields) {
    if (f.type !== "file") continue;
    const v = values[f.id] as FileMeta | null | undefined;
    if (!v?.file) continue;
    refs[f.id] = await uploadOneFile(v);
  }
  return refs;
}

export function NewScanLauncher({ projectId }: NewScanLauncherProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(TOOLS[0].id);
  const [valuesByTool, setValuesByTool] = useState<Record<string, FormValues>>(
    {},
  );
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submitting = phase !== "idle";

  const tool = useMemo(
    () => TOOLS.find((t) => t.id === selectedId) ?? TOOLS[0],
    [selectedId],
  );

  const values = valuesByTool[tool.id] ?? {};
  const setVal = (id: string, v: unknown) => {
    setValuesByTool((prev) => ({
      ...prev,
      [tool.id]: { ...(prev[tool.id] ?? {}), [id]: v },
    }));
  };

  const target = pickTargetField(tool);
  const requiredOk = tool.fields
    .filter((f) => f.required)
    .every((f) => {
      const v = values[f.id] ?? ("default" in f ? f.default : undefined);
      return v !== undefined && v !== null && v !== "";
    });
  const targetOk =
    target !== null &&
    typeof values[target.fieldId] === "string" &&
    (values[target.fieldId] as string).trim().length > 0;

  const canSubmit = requiredOk && targetOk && !submitting;

  async function submit() {
    if (!target) {
      setErrorMsg("This tool has no scannable target field.");
      return;
    }
    const targetValue = String(values[target.fieldId] ?? "").trim();
    if (!targetValue) {
      setErrorMsg("Target is required.");
      return;
    }

    setErrorMsg(null);
    try {
      setPhase("uploading");
      const fileRefs = await uploadFileFields(tool, values);

      // [แก้ไขแล้ว]: แยก parameters และ secrets ออกจากกันก่อนยิง API
      const allParams = buildParameters(tool, values, fileRefs);
      const parameters: Record<string, unknown> = {};
      const secrets: Record<string, string> = {};

      tool.fields.forEach((f) => {
        const val = allParams[f.id];
        if (val === undefined) return;

        // ไม่เอา Target ลงไปซ้ำใน parameters
        if (f.id === "target" || f.id === "target_ip" || f.id === "target_url" || f.id === "target_api_url") {
          return;
        }

        if (f.type === "secret") {
          secrets[f.id] = String(val);
        } else {
          parameters[f.id] = val;
        }
      });

      setPhase("queueing");
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: tool.id,
          projectId,
          target: targetValue,
          assetType: target.assetType,
          parameters, // ส่งเฉพาะ parameters ทั่วไป (ตอนนี้มี select ครบแล้ว)
          secrets,    // ส่งเฉพาะ secrets แยกลงกระเป๋าของมันเอง
        }),
      });
      
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setErrorMsg(body?.error ?? `Request failed (${res.status})`);
        setPhase("idle");
        return;
      }
      const body = (await res.json().catch(() => null)) as
        | { scanJob?: { id?: string } }
        | null;
      const jobId = body?.scanJob?.id;
      router.push(jobId ? `/scans/${jobId}` : "/dashboard");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setPhase("idle");
    }
  }

  return (
    <div
      className="nt-fade-in"
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        gap: 16,
        minHeight: "calc(100vh - 56px - 36px)",
      }}
    >
      {/* LEFT: Tool picker */}
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          position: "sticky",
          top: 18,
          alignSelf: "flex-start",
          maxHeight: "calc(100vh - 90px)",
          overflow: "auto",
          paddingRight: 4,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--ink-3)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            STEP 1 · Select tool
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
            <span className="mono tnum">{TOOLS.length}</span> tools available
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TOOLS.map((t) => (
            <ToolCard
              key={t.id}
              tool={t}
              selected={t.id === selectedId}
              onClick={() => setSelectedId(t.id)}
            />
          ))}
        </div>
      </aside>

      {/* RIGHT: Form */}
      <div
        className="nt-card nt-scale-in"
        style={{
          padding: 0,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
        key={tool.id}
      >
        {/* Tool header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--line)",
            background: `linear-gradient(135deg, color-mix(in oklab, ${tool.color} 8%, var(--surface)) 0%, var(--surface) 60%)`,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${tool.color}, color-mix(in oklab, ${tool.color} 55%, #000))`,
              color: "#fff",
              fontSize: 18,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              boxShadow: `0 8px 24px color-mix(in oklab, ${tool.color} 35%, transparent)`,
            }}
          >
            {tool.glyph}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: 10 }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--ink)",
                }}
              >
                {tool.name}
              </h2>
              <span
                className="chip"
                style={{
                  background: `color-mix(in oklab, ${tool.color} 14%, transparent)`,
                  color: tool.color,
                }}
              >
                {tool.category}
              </span>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                runtime <span className="mono">{tool.runtime}</span>
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                marginTop: 4,
              }}
            >
              {tool.desc}
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              width: 32,
              height: 32,
              borderRadius: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-3)",
            }}
            onClick={() => router.back()}
            aria-label="Close"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Form body */}
        <div
          style={{ padding: "22px 24px", overflow: "auto", flex: 1 }}
          key={tool.id + "-form"}
        >
          <DynamicForm tool={tool} values={values} onChange={setVal} />
        </div>

        {/* Footer / actions */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--line)",
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 11.5,
              color: "var(--ink-3)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="lock" size={12} />
              BYOK keys are encrypted in-flight & never written to disk
            </span>
            <span
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "var(--ink-4)",
              }}
            />
            <span>
              <span className="mono tnum">
                {tool.fields.filter((f) => f.required).length}
              </span>{" "}
              required
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            {errorMsg && (
              <span
                role="alert"
                style={{
                  fontSize: 11.5,
                  color: "var(--err)",
                  marginRight: 4,
                }}
              >
                {errorMsg}
              </span>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => router.back()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSubmit}
              style={{
                opacity: canSubmit ? 1 : 0.5,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
              onClick={submit}
            >
              <Icon name="play" size={12} stroke={2.4} />
              {phase === "uploading"
                ? "Uploading…"
                : phase === "queueing"
                  ? "Queueing…"
                  : "Run scan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}