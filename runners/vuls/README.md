# Vuls safe runner

`run-safe.sh` wraps the existing (already-safe) Vuls flow and hardens it further.

## What it preserves / fixes

| Aspect | Behaviour |
| --- | --- |
| Scan mode | `scanMode = ["fast"]` — **no exploitation** (unchanged) |
| SSH auth | **key-based only**; no password is ever accepted on the CLI |
| known_hosts | `ssh-keyscan` + `StrictHostKeyChecking=yes` (unchanged) |
| Working dir | configurable via `VULS_DIR` / `--work-dir` (was `/mnt/e/...`) |
| Run isolation | config + results scoped to `runs/<scanJobId>/` (deterministic) |
| Target safety | every IP re-validated with `validate-target.mjs` (new) |
| Output | JSON wrapped in `###VULS_JSON_START### … ###VULS_JSON_END###` (compatible with the current n8n parser) |

## Usage

Multi-target (recommended — reuse the n8n "Prepare Vuls Payload" output):

```bash
NETRA_SCOPE_ALLOWLIST="10.0.0.0/8" \
VULS_DIR="/opt/netra/runners/vuls" \
VULS_SSH_KEY="$HOME/.ssh/vuls_n8n/id_rsa" \
./run-safe.sh \
  --scan-job-id "ckxyz123" \
  --targets-file "/tmp/vuls_targets_ckxyz123.json"
```

Single target (convenience):

```bash
./run-safe.sh --scan-job-id ckxyz123 \
  --target 10.10.0.5 --ssh-user ubuntu --ssh-port 22 --legacy false
```

`--targets-file` is a JSON array of objects like:

```json
[{ "ip": "10.10.0.5", "sshUser": "ubuntu", "sshPort": 22, "legacySsh": false,
   "serverLabel": "target_10_10_0_5", "scanJobId": "ckxyz123" }]
```

## Environment

See [`env.example`](env.example): `VULS_DIR`, `VULS_SSH_KEY`,
`NETRA_SCOPE_ALLOWLIST`, `NODE_BIN`, `PYTHON_BIN`. The wrapper uses the
`vuls/vuls` Docker image if `docker` is present, otherwise a native `vuls`
binary.

## Notes

* The SSH key must be `chmod 600`. `legacySsh=true` re-enables `ssh-rsa` for old
  hosts (e.g. Metasploitable) — use only when required.
* Each run writes under `<VULS_DIR>/runs/<scanJobId>/`; clean up old run dirs on
  a schedule. They are git-ignored.
