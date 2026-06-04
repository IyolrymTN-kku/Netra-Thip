# n8n Orchestration — Netra-Thip Core Engine

This folder holds the **sanitized, version-controlled** copy of the n8n workflow
that orchestrates the security tools. The live export pulled from a running n8n
instance contains real API keys, HMAC secrets and SSH credentials and **must
never be committed** — `.gitignore` blocks `n8n-*.json` / `*Core Engine*.json`
and everything under `orchestration/n8n/*.json` except this sanitized file.

| File | Purpose |
| --- | --- |
| `workflow.sanitized.json` | Importable reference workflow with all inline secrets replaced by `REPLACE_WITH_*` placeholders and the n8n `instanceId` neutralized. Safe to commit. |

## What was sanitized

| Placeholder | Original location in the export | Move it to |
| --- | --- | --- |
| `REPLACE_WITH_SIRIUS_API_KEY` | `Get Sirius Host Result1` → `X-API-Key` header | n8n credential / `$env.SIRIUS_API_KEY` |
| `REPLACE_WITH_METLO_API_KEY` | `Get Metlo Endpoints` & `Get Metlo Alerts` → `Authorization` header (×2) | n8n credential / `$env.METLO_API_KEY` |
| `SANITIZED_N8N_INSTANCE_ID` | top-level `instanceId` | regenerated automatically on import |

> ⚠️ The keys that were in the live export are **compromised** (they sat in a
> file on disk). Rotate them on the Sirius and Metlo sides **before** wiring the
> new values into n8n. See "Rotating keys" below.

## Required n8n credentials

The workflow references these credentials by name — recreate them in your n8n
instance (Credentials → New) and re-link them after import:

| Credential (n8n type) | Used by | Notes |
| --- | --- | --- |
| **SSH Password account** (`sshPassword`) | `AutoPentestX`, `Guardian`, Vuls `Execute a command` | SSH to the tool runner host. Prefer a key-based, least-privilege account (Phase 3). |
| **Crypto account** (`crypto`) | `Crypto`, `Crypto15`, `Crypto16`, `X-Netra-Signature` | HMAC-SHA256 secret. **Must equal the portal's `N8N_CALLBACK_SECRET`.** |

## Required environment variables (n8n side)

These are referenced by workflow expressions or should replace the remaining
hardcoded endpoints when you finish Phase 3:

| Variable | Default in export | Meaning |
| --- | --- | --- |
| `SIRIUS_API_KEY` | (was inline) | Sirius REST API key (`X-API-Key`). |
| `METLO_API_KEY` | (was inline) | Metlo collector key (`Authorization`). |
| `siriusBaseUrl` | `http://host.docker.internal:9898` | Sirius REST base URL. |
| `metloBackendUrl` | `http://host.docker.internal:8080` | Metlo backend base URL. |
| RabbitMQ mgmt URL | `http://host.docker.internal:15673` | Sirius job publish endpoint. |
| Portal callback | `http://host.docker.internal:3000` | Portal base for `/api/scans/{id}/results` and `/api/scans/callback`. |

> `host.docker.internal` only resolves on Docker Desktop. On Linux/Ubuntu set
> these to real hostnames/IPs or add `extra_hosts` (covered in the production
> runbook in a later phase).

## How to import the sanitized workflow

1. Open n8n → **Workflows → Import from File**.
2. Select `orchestration/n8n/workflow.sanitized.json`.
3. Open each Sirius/Metlo HTTP node and replace the `REPLACE_WITH_*`
   placeholders with the **rotated** keys (preferably via a credential or
   `$env.*`, not inline text).
4. Recreate and re-link the **SSH Password account** and **Crypto account**
   credentials.
5. Activate the workflow and note the production webhook URL — set it as the
   portal's `N8N_WEBHOOK_URL` (use the `/webhook/...` path, not `/webhook-test/...`).

## Rotating Sirius / Metlo keys

**Sirius**

1. On the Sirius host, issue a new API key and revoke the old one
   (`f48ace3d…` — treat as burned).
2. Put the new key in an n8n credential or `$env.SIRIUS_API_KEY`.
3. Re-test the `Get Sirius Host Result1` node.

**Metlo**

1. In Metlo, generate a new collector/API key and revoke the old one
   (`metlo.wNy2…` — treat as burned).
2. Update the n8n credential / `$env.METLO_API_KEY`.
3. Re-test `Get Metlo Endpoints` and `Get Metlo Alerts`.

## Callback signing (HMAC) model

* On scan creation the **portal** computes
  `signature = HMAC_SHA256(scanJobId, N8N_CALLBACK_SECRET)` and sends it in the
  webhook payload (`src/lib/scans/signing.ts`).
* n8n **echoes** that signature back in the `X-Netra-Signature` header when it
  posts results to `POST /api/scans/{id}/results` (and status to
  `POST /api/scans/callback`).
* The **Crypto** nodes recompute the same HMAC for branches that lack an
  inbound signature (e.g. manual Sirius runs) using the **Crypto account**
  credential — which therefore **must hold the same secret** as the portal's
  `N8N_CALLBACK_SECRET`.
* The portal verifies with a constant-time comparison and rejects on mismatch
  (`401`) or terminal job (`409`).

Rotating `N8N_CALLBACK_SECRET` invalidates every in-flight signature — rotate
the portal env and the n8n **Crypto account** together, while the queue is
drained.

## Phase 3.5 — the sanitized workflow now calls the safe wrappers

`workflow.sanitized.json` has been **updated** so the dangerous SSH nodes invoke
the runner wrappers instead of unsafe inline shell. It is secret-free
(verified by `node scripts/check-n8n-workflow-secrets.mjs`) and importable once
you set the environment variables / credentials below.

### Nodes changed in this workflow

| Node | Change |
| --- | --- |
| **AutoPentestX** (SSH) | now runs `runners/autopentestx/run-safe.sh` (quoted `--target`, `--approved`); no `echo "yes"`, no unquoted interpolation |
| **Guardian** (SSH) | now runs `runners/guardian/run-safe.sh`; API key via `NETRA_AI_API_KEY` env only — **no `sed`, no key on disk, no echo** |
| **Execute a command** (Vuls, SSH) | working dir env-ized to `${VULS_DIR:-…}`; full wrapper swap **deferred** (see below) — markers/parser unchanged |
| **Get Sirius Host Result1** (HTTP) | `SIRIUS_BASE_URL` + `X-API-Key` from `$env.SIRIUS_API_KEY` |
| **RabbitMQ Publish Scan Job** (HTTP) | `SIRIUS_RABBITMQ_MGMT_URL` + Basic auth from `$env.SIRIUS_RABBITMQ_AUTH` (the old `guest:guest` is gone) |
| **Get Metlo Endpoints** / **Get Metlo Alerts** (HTTP) | `METLO_BACKEND_URL` + `Authorization` from `$env.METLO_API_KEY` |
| **HTTP Request** (results callback) | base URL from `$env.PORTAL_BASE_URL` (path/signature unchanged) |

The portal callback contract is preserved: results still POST to
`/api/scans/{id}/results` with the `X-Netra-Signature` header, and
`scanJobId`/`projectId` propagation is untouched. Sirius/Metlo branches are not
otherwise modified.

### Required n8n environment variables

Set these in n8n (Settings → Variables / container env). Each has a safe dev
fallback so the workflow still imports, but production must set them explicitly.

| Variable | Purpose |
| --- | --- |
| `NETRA_RUNNERS_DIR` | path to the deployed `runners/` (default `/opt/netra-thip/runners`) |
| `NETRA_SCOPE_ALLOWLIST` / `NETRA_SCOPE_DENYLIST` | scope policy reused by the wrappers (falls back to `SCAN_SCOPE_*`) |
| `AUTOPENTESTX_DIR` / `GUARDIAN_DIR` / `VULS_DIR` | tool checkouts on the runner host |
| `SIRIUS_BASE_URL` | Sirius REST base (was `host.docker.internal:9898`) |
| `SIRIUS_API_KEY` | Sirius `X-API-Key` (rotate first — see below) |
| `SIRIUS_RABBITMQ_MGMT_URL` | RabbitMQ management base (was `…:15673`) |
| `SIRIUS_RABBITMQ_AUTH` | RabbitMQ `Authorization` header, e.g. `Basic <base64 user:pass>` |
| `METLO_BACKEND_URL` | Metlo backend base (was `…:8080`) |
| `METLO_API_KEY` | Metlo `Authorization` token (rotate first) |
| `PORTAL_BASE_URL` | portal base for callbacks (was `host.docker.internal:3000`) |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` / `GEMINI_API_KEY` / `OPENROUTER_API_KEY` | optional static AI provider config; for per-project BYOK the key flows from the webhook body into `NETRA_AI_API_KEY` and the Guardian wrapper maps it |

### Required n8n credentials

* **SSH Password account** (`sshPassword`) — SSH into the runner host (prefer a
  key-based, least-privilege account).
* **Crypto account** (`crypto`) — HMAC secret; **must equal** the portal's
  `N8N_CALLBACK_SECRET`.

### How to import

1. Deploy `runners/` to the runner host (e.g. `/opt/netra-thip/runners`) and
   `chmod +x runners/**/run-safe.sh`. Install Node 20+ and Python 3.
2. n8n → **Workflows → Import from File** → `workflow.sanitized.json`.
3. Set the environment variables above and re-create the two credentials.
4. **Rotate** the Sirius and Metlo keys (and RabbitMQ auth) before putting the
   real values in env — the previous ones are burned.
5. Activate; set the portal's `N8N_WEBHOOK_URL` to the production `/webhook/...`.

### How to test each branch safely

* **Vuls / Metlo / Sirius (quick):** no approval needed — run against an
  allowlisted lab host (e.g. a `192.168.x`/`10.x` Metasploitable). Confirm
  results post back and the scan flips to `COMPLETED`.
* **AutoPentestX / Guardian offensive:** set `parameters.approved = true` in the
  portal form. Without it the wrapper returns a structured `APPROVAL_REQUIRED`
  failure and exits non-zero (verify this first — run once with approval off).
* **Scope:** try an out-of-allowlist or public target — the portal rejects it
  (`403`) and, even if bypassed, the runner wrapper re-rejects it.

### How to rollback

The previous workflow is recoverable two ways:
* In n8n: the editor keeps version history — revert to the prior version, or
  re-import your last known-good export.
* In git: `git checkout -- orchestration/n8n/workflow.sanitized.json` restores
  the pre-3.5 sanitized copy (it can also be regenerated from the live export
  with the Phase-1 sanitizer if needed).

### Deferred: Vuls full wrapper swap

Only the Vuls **working directory** was env-ized in the JSON; the inline scan
logic (config-gen, strict `known_hosts`, fast mode, `###VULS_JSON_START/END###`
markers, downstream parser) is left intact to avoid regressions. To complete the
swap, replace the **Execute a command** node body with the invocation in the
"Reference" section below (the `runners/vuls/run-safe.sh` wrapper emits the same
markers). Validate against a lab host before switching production.

> **End-to-end note:** Phase 3 is only complete end-to-end once this updated
> workflow is **imported into the live n8n instance** (or the live nodes are
> hand-edited per the reference below) **and** the Sirius/Metlo/RabbitMQ secrets
> are rotated. Until then the running engine may still use the old unsafe nodes.

## Reference: hand-editing an existing live workflow (ALTERNATIVE)

If you prefer to edit your existing live workflow in place instead of importing
the updated file, apply these node-by-node changes. Deploy `runners/` to the
runner host first and `chmod +x runners/**/run-safe.sh`.

### AutoPentestX node

Replace the command:

```bash
# OLD (unsafe — injection + auto-accept):
cd /mnt/e/web/Netra-Thip/AutopentestX/AutoPentestX && source venv/bin/activate && \
  echo "yes" | python3 main.py -t {{$json.target}} -n "NetraThip-{{$json.scanJobId}}" --json

# NEW (safe wrapper):
NETRA_SCOPE_ALLOWLIST="{{$env.SCAN_SCOPE_ALLOWLIST}}" \
AUTOPENTESTX_DIR="/opt/netra/runners/AutoPentestX" \
/opt/netra/runners/autopentestx/run-safe.sh \
  --target "{{$json.target}}" \
  --scan-job-id "{{$json.scanJobId}}" \
  --operator "{{$json.parameters.operator_name}}" \
  --approved "{{$json.parameters.approved}}"
```

n8n still expands `{{$json.target}}`, but it is now a **single argument** to the
wrapper, which re-validates it and passes it to Python as one argv element —
the shell never re-parses it.

### Guardian node

```bash
# OLD (unsafe — sed-injects the API key into config/guardian.yaml):
cd /mnt/e/va_tools/guardian/guardian-cli && source venv/bin/activate && \
  export ... && sed -i ... api_key: ${T_KEY} ... && python -m cli.main workflow run ...

# NEW (env-only secret, no sed):
NETRA_SCOPE_ALLOWLIST="{{$env.SCAN_SCOPE_ALLOWLIST}}" \
NETRA_AI_API_KEY="{{$json.secrets.ai_api_key}}" \
GUARDIAN_DIR="/opt/netra/runners/guardian-cli" \
/opt/netra/runners/guardian/run-safe.sh \
  --target "{{$json.target}}" \
  --scan-job-id "{{$json.scanJobId}}" \
  --workflow "{{$json.parameters.workflow_name}}" \
  --provider "{{$json.parameters.ai_provider}}" \
  --model "{{$json.secrets.model}}" \
  --base-url "{{$json.secrets.base_url}}" \
  --approved "{{$json.parameters.approved}}"
```

The API key flows in via `NETRA_AI_API_KEY` (environment), **never** as a CLI
argument and **never** written to `guardian.yaml`. Configure `guardian.yaml` on
the runner to read provider/model/api_key from the environment (see
`runners/guardian/README.md`).

### Vuls node

```bash
# Keep "Prepare Vuls Payload" as-is; write its targets array to a file, then:
NETRA_SCOPE_ALLOWLIST="{{$env.SCAN_SCOPE_ALLOWLIST}}" \
VULS_DIR="/opt/netra/runners/vuls" \
VULS_SSH_KEY="$HOME/.ssh/vuls_n8n/id_rsa" \
/opt/netra/runners/vuls/run-safe.sh \
  --scan-job-id "{{$json.scanJobs[0].scanJobId}}" \
  --targets-file "/tmp/vuls_targets_{{$json.scanJobs[0].scanJobId}}.json"
```

Output still uses the `###VULS_JSON_START### … ###VULS_JSON_END###` markers, so
the existing downstream "Code in JavaScript" parser node is unchanged.

### Sirius / Metlo nodes

No wrapper. Replace the inline `X-API-Key` / `Authorization` with the rotated
keys via n8n credentials or `$env.SIRIUS_API_KEY` / `$env.METLO_API_KEY`, and
parameterize the base URLs (see `runners/sirius/README.md`,
`runners/metlo/README.md`).

### Passing `approved` through

The portal now collects `parameters.approved` (and `approval_ticket`) and
enforces the approval gate server-side. Ensure the webhook payload carries
`parameters.approved` so n8n can forward it as `--approved`. The wrapper is the
final backstop: offensive tools refuse to run without it.

