// Approval gating for offensive / deep scan tools.
//
// AutoPentestX is always approval-required. Guardian is approval-required only
// for offensive/deep workflows. Passive/VA tools (Vuls, Metlo, Sirius safe
// profiles, Caido, SILENTCHAIN) are not gated here.
//
// Approval is an operator self-attestation captured in the scan `parameters`
// (and audited at scan creation). It is enforced server-side in the scan route
// and again at the runner wrapper (`--approved`).

/** Tools that always require explicit approval to run. */
export const APPROVAL_REQUIRED_TOOLS: ReadonlySet<string> = new Set(["autopentestx"]);

/** Substrings that mark a Guardian workflow as offensive/deep. */
export const OFFENSIVE_WORKFLOW_KEYWORDS = ["pentest", "exploit", "attack", "full"] as const;

/** Explicit offensive/deep Guardian workflow names (incl. the misspelling in the registry). */
export const OFFENSIVE_WORKFLOW_NAMES = [
  "network_pentest",
  "full_vuln_scan",
  "autonomous",
  "autonomus",
] as const;

export function isOffensiveWorkflow(workflow: unknown): boolean {
  const w = typeof workflow === "string" ? workflow.trim().toLowerCase() : "";
  if (!w) return false;
  if ((OFFENSIVE_WORKFLOW_NAMES as readonly string[]).includes(w)) return true;
  return OFFENSIVE_WORKFLOW_KEYWORDS.some((k) => w.includes(k));
}

/** Does this tool + parameter combination require approval before dispatch? */
export function requiresApproval(
  toolName: string,
  parameters: Record<string, unknown> = {},
): boolean {
  const tool = (toolName ?? "").toLowerCase();
  if (APPROVAL_REQUIRED_TOOLS.has(tool)) return true;
  if (tool === "guardian") {
    return isOffensiveWorkflow(parameters.workflow_name ?? parameters.workflow);
  }
  return false;
}

/** Has the operator explicitly approved this scan? Accepts boolean true or "true". */
export function isApproved(parameters: Record<string, unknown> = {}): boolean {
  const v = parameters.approved;
  if (v === true) return true;
  if (typeof v === "string") return v.trim().toLowerCase() === "true";
  return false;
}
