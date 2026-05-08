// Tool registry for the New Scan launcher.
// Discriminated union on `type` keeps each field's extras statically known.

export type FieldGroup = "Target" | "Auth" | "Engine" | "Input" | "General";

interface FieldBase {
  id: string;
  label: string;
  required?: boolean;
  group?: FieldGroup;
  hint?: string;
  hideWhen?: { field: string; equals: string | number | boolean };
}

export type TextLikeField = FieldBase & {
  type: "text" | "ip" | "url";
  placeholder?: string;
  default?: string;
};

export type NumberField = FieldBase & {
  type: "number";
  min?: number;
  max?: number;
  default?: number;
};

export type TextareaField = FieldBase & {
  type: "textarea";
  placeholder?: string;
};

export type SelectField = FieldBase & {
  type: "select";
  options: string[];
  default?: string;
};

export type MultiSelectField = FieldBase & {
  type: "multiselect";
  options: string[];
  default?: string[];
};

export type FileField = FieldBase & {
  type: "file";
  accept?: string;
};

export type SecretField = FieldBase & {
  type: "secret";
  placeholder?: string;
};

export type ToggleField = FieldBase & {
  type: "toggle";
  default?: boolean;
};

export type FieldConfig =
  | TextLikeField
  | NumberField
  | TextareaField
  | SelectField
  | MultiSelectField
  | FileField
  | SecretField
  | ToggleField;

export interface ToolDef {
  id: string;
  name: string;
  tagline: string;
  glyph: string;
  color: string;
  category: string;
  cat: 1 | 2 | 3;
  runtime: string;
  desc: string;
  fields: FieldConfig[];
}

export const TOOLS: ToolDef[] = [
  // ─── Cat 1 — CLI ───
  {
    id: "autopentestx",
    name: "AutoPentestX",
    tagline: "Automated multi-stage pentest",
    glyph: "A",
    color: "#E11D48",
    category: "Pentest",
    cat: 1,
    runtime: "~ 18 min",
    desc: "AI-orchestrated reconnaissance → exploit chain.",
    fields: [
      { id: "target_ip", label: "Target IP", type: "ip", placeholder: "192.168.15.131", required: true, group: "Target" },
      { id: "scan_mode", label: "Scan mode", type: "select", options: ["Stealth", "Balanced", "Aggressive"], default: "Balanced", group: "Engine" },
      { id: "operator_name", label: "Operator name", type: "text", placeholder: "Aroon S.", group: "Engine" },
    ],
  },
  {
    id: "guardian",
    name: "Guardian-CLI",
    tagline: "Workflow-based security automation",
    glyph: "G",
    color: "#10B981",
    category: "Workflow",
    cat: 1,
    runtime: "~ 6 min",
    desc: "Runs network/web/recon workflows with AI narration.",
    fields: [
      { id: "target", label: "Target", type: "text", placeholder: "apds.kku.ac.th", required: true, group: "Target" },
      { id: "workflow_name", label: "Workflow", type: "select", options: ["network_pentest", "web_pentest", "recon", "adanvan_recon", "autonomus", "full_vuln_scan", "wordpress_aduit"], default: "web_pentest", required: true, group: "Engine" },
      { id: "ai_provider", label: "AI provider", type: "select", options: ["openai", "gemini", "claude", "openrouter"], default: "openai", required: true,group: "Engine" },
      { id: "ai_api_key", label: "AI API Key", type: "secret", placeholder: "sk-…", group: "Engine", hint: "BYOK · never stored" },
      { id: "model", label: "model", type: "secret", placeholder: "gemini-2.5", group: "Engine", hint: "BYOK · never stored" },
      { id: "base_url", label: "Base URL", type: "secret", placeholder: "https://gen…", group: "Engine", hint: "BYOK · never stored" }
    ],
  },
  {
    id: "vuls",
    name: "VULS",
    tagline: "Linux/Unix CVE scanner",
    glyph: "V",
    color: "#EAB308",
    category: "VA Scan",
    cat: 1,
    runtime: "~ 8 min",
    desc: "Agent-less SSH-based vulnerability scanner.",
    fields: [
      { id: "target_ip", label: "Target IP", type: "ip", placeholder: "192.168.159.130", required: true, group: "Target" },
      { id: "ssh_user", label: "SSH user", type: "text", placeholder: "ubuntu", required: true, group: "Auth" },
      { id: "ssh_port", label: "SSH port", type: "number", default: 22, min: 1, max: 65535, group: "Auth" },
    ],
  },
  // ─── Cat 2 — API ───
  {
    id: "metlo",
    name: "Metlo",
    tagline: "API security & traffic analysis",
    glyph: "M",
    color: "#F97316",
    category: "API",
    cat: 2,
    runtime: "~ 5 min",
    desc: "Detects API drift, BOLA & PII leakage.",
    fields: [
      { id: "target_api_url", label: "API URL", type: "url", placeholder: "http://localhost:6001", required: true, group: "Target" },
      { id: "metlo_api_key", label: "Metlo API Key", type: "secret", required: true, group: "Auth" },
    ],
  },
  {
  id: "sirius",
  name: "Sirius Scan",
  tagline: "Network vulnerability scanner",
  glyph: "Si",
  color: "#06B6D4",
  category: "VA Scan",
  cat: 2,
  runtime: "~ 12 min",
  desc: "Runs Sirius Scan through its REST API with target type and scan profile options.",
  fields: [
    { id: "target_ip",label: "Target IP / Host", type: "text", placeholder: "192.168.x.x", required: true, group: "Target", hint: "IP address, CIDR range, IP range, or domain name to scan."},
    { id: "target_type", label: "Target Type", type: "select", options: ["single_ip", "cidr", "ip_range", "domain"], default: "single_ip", required: true, group: "Target", hint: "This value is sent to Sirius as targets[].type." },
    { id: "scan_profile", label: "Scan Profile", type: "select", options: ["Quick Scan", "High Risk Scan", "All Scripts Scan", "Full Scan (Network + Agent)", "Agent Only Scan"], default: "quick", required: true, group: "Engine", hint: "This value is sent to Sirius as options.template." },
  ],
},
  // ─── Cat 3 — Upload ───
  {
    id: "caido",
    name: "Caido",
    tagline: "Web traffic findings ingestion",
    glyph: "C",
    color: "#0066FF",
    category: "Web Audit",
    cat: 3,
    runtime: "Instant",
    desc: "Imports Caido findings & request exports for AI analysis.",
    fields: [
      { id: "findings_file", label: "Findings export", type: "file", accept: ".json", required: true, group: "Input" },
      { id: "requests_file", label: "Requests export", type: "file", accept: ".json", required: true, group: "Input" },
      { id: "target_filter", label: "Target filter", type: "text", placeholder: "dvwa.csalab.app", group: "Input" },
      { id: "ai_provider", label: "AI provider", type: "select", options: ["openai", "gemini"], default: "openai", group: "Engine" },
      { id: "ai_api_key", label: "AI API Key", type: "secret", required: true, group: "Engine" },
    ],
  },
  {
    id: "silentchain",
    name: "SILENTCHAIN AI",
    tagline: "Supply-chain AI analysis",
    glyph: "S",
    color: "#7C3AED",
    category: "SCA",
    cat: 3,
    runtime: "Instant",
    desc: "Reasons about exploit chains across an export.",
    fields: [
      { id: "export_file", label: "Export file", type: "file", accept: ".json", required: true, group: "Input" },
      { id: "ai_provider", label: "AI provider", type: "select", options: ["ollama", "openai", "claude", "gemini"], default: "claude", required: true, group: "Engine" },
      { id: "ai_api_key", label: "AI API Key", type: "secret", group: "Engine", hideWhen: { field: "ai_provider", equals: "ollama" } },
    ],
  },
];

export const CAT_META: Record<1 | 2 | 3, { label: string; color: string; desc: string }> = {
  1: { label: "CLI", color: "#F97316", desc: "Python · n8n Docker exec" },
  2: { label: "API", color: "#0066FF", desc: "Docker · HTTP Request node" },
  3: { label: "Upload", color: "#10B981", desc: "JSON ingestion · no live exec" },
};

export const getTool = (id: string): ToolDef | undefined =>
  TOOLS.find((t) => t.id === id);
