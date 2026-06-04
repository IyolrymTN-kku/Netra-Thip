# Guardian-CLI safe runner

`run-safe.sh` replaces the old n8n SSH command that injected secrets into
`config/guardian.yaml` with `sed`.

## What it fixes

| Old behaviour (n8n inline) | New behaviour (`run-safe.sh`) |
| --- | --- |
| `sed -i ... api_key: ${T_KEY}` → **API key written to disk** in `guardian.yaml` | key passed via **environment only**; config never modified |
| key/model/base_url interpolated into a `sed` expression → injection | values passed as args/env, target validated |
| any workflow runnable unattended | offensive/deep workflows require `--approved true` |
| path hardcoded to `/mnt/e/...` | `GUARDIAN_DIR` env / `--tool-dir` |

## Secret handling (environment only)

The wrapper **does not** accept the API key as a CLI argument (so it never shows
in `ps`). Provide it via environment:

* `NETRA_AI_API_KEY` — generic; the wrapper maps it to the right provider var, **or**
* a provider-specific variable directly: `OPENAI_API_KEY`, `OPENAI_BASE_URL`,
  `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`.

Mapping by `--provider`:

| provider | key var set | base URL var |
| --- | --- | --- |
| `openai` | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| `openrouter` | `OPENROUTER_API_KEY` | `OPENAI_BASE_URL` |
| `claude`/`anthropic` | `ANTHROPIC_API_KEY` | — |
| `gemini`/`google` | `GEMINI_API_KEY` + `GOOGLE_API_KEY` | — |

Non-secret selectors are exported for the tool to read:
`GUARDIAN_PROVIDER`, `GUARDIAN_MODEL`, `GUARDIAN_BASE_URL`.

> **Required runner setup:** because we no longer `sed` the config, configure
> `config/guardian.yaml` on the runner to read provider/model/base_url/api_key
> from the environment (e.g. `${GUARDIAN_PROVIDER}`, `${OPENAI_API_KEY}`), or set
> a static provider/model there. The key itself must come from the env var, not
> the file.

## Usage

```bash
NETRA_SCOPE_ALLOWLIST="10.0.0.0/8" \
NETRA_AI_API_KEY="$AI_API_KEY" \
GUARDIAN_DIR="/opt/netra/runners/guardian-cli" \
./run-safe.sh \
  --target "10.10.0.5" \
  --scan-job-id "ckxyz123" \
  --workflow "recon" \
  --provider "openai" \
  --model "gpt-4o-mini" \
  --base-url "" \
  --approved "false"
```

## Approval

Offensive/deep workflows require `--approved true`:
any name containing `pentest`, `exploit`, `attack`, `full`, or equal to
`autonomus`/`autonomous`/`network_pentest`/`full_vuln_scan`. Recon-style
workflows run without approval but **still** require the target to be in scope.

## Output & exit codes

* stdout: the Guardian session JSON (`findings`, `tool_executions`,
  `ai_decisions`). Exit `0`.
* On guard failure or no session JSON: structured failure JSON + non-zero exit.
* The API key is never printed; tool logs go to `reports/netrathip-<id>.log` on
  the runner and are not echoed to stdout.
