"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Icon } from "@/components/icons/Icon";
import type {
  FieldConfig,
  FileField as FileFieldDef,
  MultiSelectField as MultiSelectFieldDef,
  NumberField as NumberFieldDef,
  SecretField as SecretFieldDef,
  SelectField as SelectFieldDef,
  TextLikeField as TextLikeFieldDef,
  TextareaField as TextareaFieldDef,
  ToggleField as ToggleFieldDef,
  ToolDef,
} from "@/lib/tools/registry";

export type FormValues = Record<string, unknown>;
export interface FileMeta {
  name: string;
  size: number;
  type: string;
}

interface FieldShellProps {
  field: FieldConfig;
  children: React.ReactNode;
}

function FieldShell({ field, children }: FieldShellProps) {
  return (
    <div className="nt-field">
      <label className="nt-field-label">
        <span>
          {field.label}
          {field.required && <span className="nt-field-required">*</span>}
        </span>
        {field.hint && <span className="nt-field-hint">{field.hint}</span>}
      </label>
      {children}
    </div>
  );
}

interface FieldProps<T, V> {
  field: T;
  value: V | undefined;
  onChange: (value: V) => void;
}

function TextField({
  field,
  value,
  onChange,
}: FieldProps<TextLikeFieldDef, string>) {
  const mono = field.type === "ip" || field.type === "url";
  return (
    <FieldShell field={field}>
      <input
        type="text"
        className={"nt-input" + (mono ? " mono" : "")}
        placeholder={field.placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

function NumberFieldComp({
  field,
  value,
  onChange,
}: FieldProps<NumberFieldDef, number>) {
  const v = value ?? field.default ?? "";
  return (
    <FieldShell field={field}>
      <input
        type="number"
        className="nt-input mono"
        min={field.min}
        max={field.max}
        value={v as number | string}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </FieldShell>
  );
}

function TextareaFieldComp({
  field,
  value,
  onChange,
}: FieldProps<TextareaFieldDef, string>) {
  return (
    <FieldShell field={field}>
      <textarea
        className="nt-textarea mono"
        placeholder={field.placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </FieldShell>
  );
}

function SelectFieldComp({
  field,
  value,
  onChange,
}: FieldProps<SelectFieldDef, string>) {
  const v = value ?? field.default ?? "";
  if (field.options.length <= 4) {
    return (
      <FieldShell field={field}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {field.options.map((opt) => (
            <button
              key={opt}
              type="button"
              className="nt-chip-opt"
              data-on={v === opt}
              onClick={() => onChange(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </FieldShell>
    );
  }
  return (
    <FieldShell field={field}>
      <div style={{ position: "relative" }}>
        <select
          className="nt-select"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          style={{ appearance: "none", paddingRight: 32 }}
        >
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-3)",
            pointerEvents: "none",
          }}
        >
          <Icon name="chevronDown" size={14} />
        </span>
      </div>
    </FieldShell>
  );
}

function MultiSelectFieldComp({
  field,
  value,
  onChange,
}: FieldProps<MultiSelectFieldDef, string[]>) {
  const v = value ?? field.default ?? [];
  const toggle = (opt: string) => {
    if (v.includes(opt)) onChange(v.filter((x) => x !== opt));
    else onChange([...v, opt]);
  };
  return (
    <FieldShell field={field}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {field.options.map((opt) => (
          <button
            key={opt}
            type="button"
            className="nt-chip-opt"
            data-on={v.includes(opt)}
            onClick={() => toggle(opt)}
          >
            {v.includes(opt) && <Icon name="check" size={11} stroke={2.4} />}
            {opt}
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

function FileFieldComp({
  field,
  value,
  onChange,
}: FieldProps<FileFieldDef, FileMeta | null>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const file = value ?? null;

  function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onChange({ name: f.name, size: f.size, type: f.type });
  }

  return (
    <FieldShell field={field}>
      <div
        className={"nt-file" + (file ? " has-file" : "")}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onChange({ name: f.name, size: f.size, type: f.type });
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: file ? "rgba(16,185,129,0.15)" : "var(--surface-3)",
            color: file ? "var(--ok)" : "var(--ink-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon
            name={file ? "check" : "download"}
            size={16}
            stroke={file ? 2.4 : 1.6}
          />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {file ? (
            <>
              <div
                className="mono"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-3)",
                  marginTop: 2,
                }}
              >
                {(file.size / 1024).toFixed(1)} KB · ready to upload
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--ink-2)",
                }}
              >
                Drop file or click to browse
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-3)",
                  marginTop: 2,
                }}
              >
                Accepts <span className="mono">{field.accept || "any"}</span>
              </div>
            </>
          )}
        </div>
        {file && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ height: 24, fontSize: 10.5 }}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={field.accept}
          style={{ display: "none" }}
          onChange={onFiles}
        />
      </div>
    </FieldShell>
  );
}

function SecretFieldComp({
  field,
  value,
  onChange,
}: FieldProps<SecretFieldDef, string>) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell field={field}>
      <div className="nt-secret">
        <span className="nt-secret-strip" />
        <input
          type={visible ? "text" : "password"}
          className="nt-input mono"
          placeholder={field.placeholder ?? "••••••••••••"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingLeft: 14, paddingRight: 84 }}
          autoComplete="off"
        />
        <button
          type="button"
          className="nt-secret-toggle"
          onClick={() => setVisible((v) => !v)}
        >
          <Icon name={visible ? "x" : "lock"} size={12} />
          {visible ? "HIDE" : "SHOW"}
        </button>
      </div>
    </FieldShell>
  );
}

function ToggleFieldComp({
  field,
  value,
  onChange,
}: FieldProps<ToggleFieldDef, boolean>) {
  const v = value ?? field.default ?? false;
  return (
    <div
      className="nt-field"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--surface-2)",
        border: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <span
          style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}
        >
          {field.label}
        </span>
        {field.hint && (
          <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
            {field.hint}
          </span>
        )}
      </div>
      <div
        className="nt-toggle-track"
        data-on={v}
        onClick={() => onChange(!v)}
      >
        <div className="nt-toggle-thumb" />
      </div>
    </div>
  );
}

function renderField(
  field: FieldConfig,
  value: unknown,
  onChange: (value: unknown) => void,
) {
  switch (field.type) {
    case "text":
    case "url":
    case "ip":
      return (
        <TextField
          field={field}
          value={value as string | undefined}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <NumberFieldComp
          field={field}
          value={value as number | undefined}
          onChange={onChange}
        />
      );
    case "textarea":
      return (
        <TextareaFieldComp
          field={field}
          value={value as string | undefined}
          onChange={onChange}
        />
      );
    case "select":
      return (
        <SelectFieldComp
          field={field}
          value={value as string | undefined}
          onChange={onChange}
        />
      );
    case "multiselect":
      return (
        <MultiSelectFieldComp
          field={field}
          value={value as string[] | undefined}
          onChange={onChange}
        />
      );
    case "file":
      return (
        <FileFieldComp
          field={field}
          value={value as FileMeta | null | undefined}
          onChange={onChange}
        />
      );
    case "secret":
      return (
        <SecretFieldComp
          field={field}
          value={value as string | undefined}
          onChange={onChange}
        />
      );
    case "toggle":
      return (
        <ToggleFieldComp
          field={field}
          value={value as boolean | undefined}
          onChange={onChange}
        />
      );
  }
}

interface DynamicFormProps {
  tool: ToolDef;
  values: FormValues;
  onChange: (fieldId: string, value: unknown) => void;
}

export function DynamicForm({ tool, values, onChange }: DynamicFormProps) {
  const visible = tool.fields.filter((f) => {
    if (!f.hideWhen) return true;
    const ref = tool.fields.find((x) => x.id === f.hideWhen!.field);
    const refDefault =
      ref && "default" in ref ? (ref as { default?: unknown }).default : undefined;
    const current = values[f.hideWhen.field] ?? refDefault;
    return current !== f.hideWhen.equals;
  });

  const groups = new Map<string, FieldConfig[]>();
  for (const f of visible) {
    const g = f.group ?? "General";
    const list = groups.get(g) ?? [];
    list.push(f);
    groups.set(g, list);
  }

  return (
    <div
      className="nt-stagger"
      style={{ display: "flex", flexDirection: "column", gap: 22 }}
    >
      {Array.from(groups.entries()).map(([gname, fields]) => (
        <fieldset
          key={gname}
          style={{
            border: 0,
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <legend
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--ink-3)",
              textTransform: "uppercase",
              padding: 0,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
            }}
          >
            <span>{gname}</span>
            <span
              style={{ flex: 1, height: 1, background: "var(--line)" }}
            />
          </legend>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {fields.map((f) => {
              const fullWidth = ["textarea", "file", "multiselect"].includes(
                f.type,
              );
              return (
                <div
                  key={f.id}
                  style={{ gridColumn: fullWidth ? "1 / -1" : "auto" }}
                >
                  {renderField(f, values[f.id], (v) => onChange(f.id, v))}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
