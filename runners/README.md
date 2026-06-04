# Netra-Thip Tool Runners

These are the **safe execution contracts** for the security tools that n8n drives
over SSH. Instead of n8n composing risky shell commands inline, n8n calls a
wrapper script here. Each wrapper:

* re-validates the target on the runner host (defence in depth — see
  [`common/validate-target.mjs`](common/validate-target.mjs));
* refuses unsafe input (shell metacharacters, command substitution, public /
  loopback / link-local / metadata addresses, targets outside the allowlist);
* enforces the **approval gate** for offensive/deep tools;
* keeps secrets in environment variables (never on disk, never in args/logs);
* emits JSON on stdout suitable for the existing n8n parsers.

See [`common/safe-shell.md`](common/safe-shell.md) for the shell-safety rules all
wrappers follow.

## Tool risk classification

| Tool | Class | Approval | Wrapper |
| --- | --- | --- | --- |
| **AutoPentestX** | Offensive (deep) | **Always required** | `autopentestx/run-safe.sh` |
| **Guardian-CLI** | Mixed | **Required** for offensive/deep workflows (`*pentest*`, `*exploit*`, `*attack*`, `*full*`, `autonomus`/`autonomous`) | `guardian/run-safe.sh` |
| **Vuls** | VA (passive, agentless) | Not required | `vuls/run-safe.sh` |
| **Sirius** | VA scanner | Not required (safe profiles) | REST/queue, see `sirius/README.md` |
| **Metlo** | Passive telemetry | Not required | REST, see `metlo/README.md` |

All tools — including the non-approval ones — still require the target to pass
scope validation (allowlist, no public/loopback/metadata).

## How n8n calls a wrapper

The n8n SSH node runs the wrapper with arguments and environment. Example
(AutoPentestX):

```bash
NETRA_SCOPE_ALLOWLIST="$SCAN_SCOPE_ALLOWLIST" \
NETRA_APPROVED="$APPROVED" \
AUTOPENTESTX_DIR="/opt/netra/runners/AutoPentestX" \
/opt/netra/runners/autopentestx/run-safe.sh \
  --target "$TARGET" \
  --scan-job-id "$SCAN_JOB_ID" \
  --operator "$OPERATOR" \
  --approved "$APPROVED"
```

Guardian (secrets via environment only — never as CLI args):

```bash
NETRA_SCOPE_ALLOWLIST="$SCAN_SCOPE_ALLOWLIST" \
NETRA_AI_API_KEY="$AI_API_KEY" \
GUARDIAN_DIR="/opt/netra/runners/guardian-cli" \
/opt/netra/runners/guardian/run-safe.sh \
  --target "$TARGET" \
  --scan-job-id "$SCAN_JOB_ID" \
  --workflow "$WORKFLOW_NAME" \
  --provider "$AI_PROVIDER" \
  --model "$MODEL" \
  --base-url "$BASE_URL" \
  --approved "$APPROVED"
```

Vuls (key-based SSH; targets come from a JSON file the n8n "Prepare Vuls
Payload" node already builds):

```bash
NETRA_SCOPE_ALLOWLIST="$SCAN_SCOPE_ALLOWLIST" \
VULS_DIR="/opt/netra/runners/vuls" \
VULS_SSH_KEY="$HOME/.ssh/vuls_n8n/id_rsa" \
/opt/netra/runners/vuls/run-safe.sh \
  --scan-job-id "$SCAN_JOB_ID" \
  --targets-file "/tmp/vuls_targets_${SCAN_JOB_ID}.json"
```

## Configuring runner host paths

Nothing is hardcoded to `/mnt/e/...` anymore. Set these per host (see each
tool's `env.example`):

| Variable | Meaning | Example |
| --- | --- | --- |
| `AUTOPENTESTX_DIR` | AutoPentestX checkout | `/opt/netra/runners/AutoPentestX` |
| `GUARDIAN_DIR` | Guardian-CLI checkout | `/opt/netra/runners/guardian-cli` |
| `VULS_DIR` | Vuls working dir | `/opt/netra/runners/vuls` |
| `VULS_SSH_KEY` | Vuls SSH private key | `~/.ssh/vuls_n8n/id_rsa` |
| `NODE_BIN` / `PYTHON_BIN` | interpreters | `node` / `python3` |
| `NETRA_SCOPE_ALLOWLIST` | allowed CIDRs/domains | `10.0.0.0/8,192.168.0.0/16` |

## How approval works

1. Operator ticks **"I am authorized to test this target"** in the portal New
   Scan form (`parameters.approved = true`, plus an optional ticket reference).
2. The portal **audits** the scan and rejects offensive/deep tools when approval
   is missing (`403 APPROVAL_REQUIRED`).
3. n8n forwards `approved` to the wrapper as `--approved`.
4. The wrapper refuses to run offensive actions without `--approved true`.

Approval is enforced in **three** places (portal, n8n payload, runner) so no
single misconfiguration re-opens the gate.

## Windows / WSL2 setup notes

* The wrappers are POSIX `sh` scripts — run them inside **WSL2** (Ubuntu), not
  PowerShell. n8n on Docker Desktop SSHes into the WSL host.
* Keep the repo on the Windows filesystem but the tool checkouts on the Linux
  side (e.g. `/opt/netra/runners/...`) for correct permissions on SSH keys.
* Ensure `node` and `python3` are on PATH inside WSL (`which node python3`).
* SSH keys for Vuls must be `chmod 600` and owned by the WSL user.

## Ubuntu runner setup notes

* Install Node 20+ and Python 3.10+; put tool checkouts under `/opt/netra/runners`.
* Create a dedicated, least-privilege user to run the wrappers; grant only the
  scoped `sudo` the tools actually need (nmap `-sS/-O` need raw sockets).
* Provide `/etc/netra/runner.env` (copy from each `env.example`) and have n8n
  source it, or pass the variables inline on the SSH command.
* Do **not** expose the Docker socket to the portal; tool containers run on the
  runner host only.

## Manual migration from the old n8n commands

The exact node-by-node replacement (old inline command → wrapper invocation) is
documented in [`../orchestration/n8n/README.md`](../orchestration/n8n/README.md).
