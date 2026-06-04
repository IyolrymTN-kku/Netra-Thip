#!/bin/sh
# Guardian-CLI safe runner wrapper.
#
# Fixes the P0 issues in the old n8n SSH command:
#   * NO `sed` rewriting of config/guardian.yaml — secrets never touch disk here
#   * provider / model / base_url / API key passed via ENVIRONMENT ONLY
#   * API key is never echoed or written to stdout
#   * target re-validated; offensive/deep workflows require --approved true
#
# Usage:
#   run-safe.sh --target <t> --scan-job-id <id> --workflow <wf> \
#     --provider <p> --model <m> --base-url <u> --approved <true|false> [--tool-dir <dir>]
#
# The AI API key is read from the environment (NETRA_AI_API_KEY or a provider
# variable such as OPENAI_API_KEY). It is NOT accepted as a CLI argument so it
# never appears in process listings.
#
# Output: Guardian session JSON on stdout (for n8n); chatter/logs to a file.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
NODE_BIN=${NODE_BIN:-node}
PYTHON_BIN=${PYTHON_BIN:-python}
VALIDATOR="$SCRIPT_DIR/../common/validate-target.mjs"

TARGET=""
SCAN_JOB_ID=""
WORKFLOW=""
PROVIDER=""
MODEL=""
BASE_URL=""
APPROVED="${NETRA_APPROVED:-false}"
TOOL_DIR="${GUARDIAN_DIR:-/opt/netra/runners/guardian-cli}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --target) TARGET="${2:-}"; shift 2 ;;
    --scan-job-id) SCAN_JOB_ID="${2:-}"; shift 2 ;;
    --workflow) WORKFLOW="${2:-}"; shift 2 ;;
    --provider) PROVIDER="${2:-}"; shift 2 ;;
    --model) MODEL="${2:-}"; shift 2 ;;
    --base-url) BASE_URL="${2:-}"; shift 2 ;;
    --approved) APPROVED="${2:-}"; shift 2 ;;
    --tool-dir) TOOL_DIR="${2:-}"; shift 2 ;;
    *) printf '%s\n' "unknown argument: $1" >&2; exit 2 ;;
  esac
done

NETRA_TOOL="guardian"
export NETRA_TOOL

emit_failure() {
  NETRA_CODE="$1" NETRA_REASON="$2" NETRA_T="$TARGET" NETRA_SJ="$SCAN_JOB_ID" \
    "$NODE_BIN" -e 'const o={toolName:process.env.NETRA_TOOL,status:"failed",scanJobId:process.env.NETRA_SJ||null,target:process.env.NETRA_T||null,findings:[],tool_executions:[],ai_decisions:[],error:{code:process.env.NETRA_CODE,reason:process.env.NETRA_REASON}};process.stdout.write(JSON.stringify(o));' \
    2>/dev/null || printf '{"toolName":"guardian","status":"failed","findings":[],"error":{"code":"%s"}}' "$1"
}

[ -n "$TARGET" ] || { emit_failure "MISSING_TARGET" "target is required"; exit 2; }
[ -n "$SCAN_JOB_ID" ] || { emit_failure "MISSING_SCAN_JOB_ID" "scan-job-id is required"; exit 2; }
[ -n "$WORKFLOW" ] || { emit_failure "MISSING_WORKFLOW" "workflow is required"; exit 2; }

# ─── offensive workflow approval gate ───
WF_LC=$(printf '%s' "$WORKFLOW" | tr '[:upper:]' '[:lower:]')
OFFENSIVE=false
case "$WF_LC" in
  *pentest*|*exploit*|*attack*|*full*|network_pentest|full_vuln_scan|autonomous|autonomus)
    OFFENSIVE=true ;;
esac

if [ "$OFFENSIVE" = "true" ]; then
  case "$APPROVED" in
    true|TRUE|True|1|yes) : ;;
    *) emit_failure "APPROVAL_REQUIRED" "Guardian offensive/deep workflow '$WORKFLOW' requires --approved true"; exit 3 ;;
  esac
fi

# ─── re-validate target (allowlist enforced for ALL workflows) ───
if ! "$NODE_BIN" "$VALIDATOR" "$TARGET" 2>/tmp/netra_validate.$$; then
  REASON=$(cat /tmp/netra_validate.$$ 2>/dev/null || true)
  rm -f /tmp/netra_validate.$$
  emit_failure "TARGET_REJECTED" "${REASON:-target failed scope validation}"
  exit 4
fi
rm -f /tmp/netra_validate.$$

[ -d "$TOOL_DIR" ] || { emit_failure "TOOL_DIR_NOT_FOUND" "GUARDIAN_DIR not found: $TOOL_DIR"; exit 5; }

# ─── env-only secret handling (NO sed, NO config writes) ───
# If a generic key was supplied, map it to the provider-specific variable.
# Existing provider variables are preserved if already set by n8n.
GENERIC_KEY="${NETRA_AI_API_KEY:-}"
case "$(printf '%s' "$PROVIDER" | tr '[:upper:]' '[:lower:]')" in
  openai)
    [ -n "$GENERIC_KEY" ] && export OPENAI_API_KEY="${OPENAI_API_KEY:-$GENERIC_KEY}"
    [ -n "$BASE_URL" ] && export OPENAI_BASE_URL="$BASE_URL"
    ;;
  openrouter)
    [ -n "$GENERIC_KEY" ] && export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-$GENERIC_KEY}"
    [ -n "$BASE_URL" ] && export OPENAI_BASE_URL="$BASE_URL"
    ;;
  claude|anthropic)
    [ -n "$GENERIC_KEY" ] && export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-$GENERIC_KEY}"
    ;;
  gemini|google)
    [ -n "$GENERIC_KEY" ] && export GEMINI_API_KEY="${GEMINI_API_KEY:-$GENERIC_KEY}"
    [ -n "$GENERIC_KEY" ] && export GOOGLE_API_KEY="${GOOGLE_API_KEY:-$GENERIC_KEY}"
    ;;
esac
# Non-secret selectors guardian.yaml can read via ${...} interpolation.
export GUARDIAN_PROVIDER="$PROVIDER"
[ -n "$MODEL" ] && export GUARDIAN_MODEL="$MODEL"
[ -n "$BASE_URL" ] && export GUARDIAN_BASE_URL="$BASE_URL"
unset GENERIC_KEY

cd "$TOOL_DIR"
if [ -f "venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  . "venv/bin/activate"
fi

REPORT_DIR="${GUARDIAN_OUTPUT_DIR:-$TOOL_DIR/reports}"
mkdir -p "$REPORT_DIR" 2>/dev/null || true
LOG_FILE="$REPORT_DIR/netrathip-$SCAN_JOB_ID.log"

STARTED=$(date +%s)

set +e
"$PYTHON_BIN" -m cli.main workflow run --name "$WORKFLOW" --target "$TARGET" >"$LOG_FILE" 2>&1
RC=$?
set -e

# Prefer a session file created during this run; fall back to the newest one.
SESSION_FILE=$(ls -1t "$REPORT_DIR"/session_*.json 2>/dev/null | head -n 1 || true)
if [ -z "$SESSION_FILE" ]; then
  SESSION_FILE=$(ls -1t reports/session_*.json 2>/dev/null | head -n 1 || true)
fi

if [ -n "$SESSION_FILE" ] && [ -f "$SESSION_FILE" ]; then
  cat "$SESSION_FILE"
  exit 0
fi

emit_failure "NO_SESSION_JSON" "Guardian produced no session JSON (exit $RC). See $LOG_FILE on the runner."
exit 6
