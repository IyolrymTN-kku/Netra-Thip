#!/bin/sh
# Vuls safe runner wrapper.
#
# Preserves the existing safe behaviour (key-based SSH, strict known_hosts,
# fast / non-exploit scanMode, docker-or-native) and adds:
#   * runner-side target re-validation (allowlist / no public / no loopback)
#   * configurable working directory (VULS_DIR / --work-dir)
#   * deterministic per-scanJobId run directory (config.toml + results scoped)
#   * NO password on the command line (key-based only)
#
# Input: a targets JSON file (array of {ip,sshUser,sshPort,legacySsh,...}) as
#        produced by the n8n "Prepare Vuls Payload" node, OR single-target flags.
#
# Output: a JSON payload wrapped in ###VULS_JSON_START### / ###VULS_JSON_END###
#         markers — compatible with the current n8n Vuls parser.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
NODE_BIN=${NODE_BIN:-node}
PYTHON_BIN=${PYTHON_BIN:-python3}
VALIDATOR="$SCRIPT_DIR/../common/validate-target.mjs"

SCAN_JOB_ID=""
TARGETS_FILE=""
WORK_DIR="${VULS_DIR:-/opt/netra/runners/vuls}"
SINGLE_TARGET=""
SINGLE_USER=""
SINGLE_PORT="22"
SINGLE_LEGACY="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --scan-job-id) SCAN_JOB_ID="${2:-}"; shift 2 ;;
    --targets-file) TARGETS_FILE="${2:-}"; shift 2 ;;
    --work-dir) WORK_DIR="${2:-}"; shift 2 ;;
    --target) SINGLE_TARGET="${2:-}"; shift 2 ;;
    --ssh-user) SINGLE_USER="${2:-}"; shift 2 ;;
    --ssh-port) SINGLE_PORT="${2:-}"; shift 2 ;;
    --legacy) SINGLE_LEGACY="${2:-}"; shift 2 ;;
    *) printf '%s\n' "unknown argument: $1" >&2; exit 2 ;;
  esac
done

fail_json() {
  # Emit a marker-wrapped failure payload compatible with the n8n parser.
  printf '###VULS_JSON_START###\n'
  NETRA_CODE="$1" NETRA_REASON="$2" NETRA_SJ="$SCAN_JOB_ID" "$NODE_BIN" -e \
    'const o={toolName:"vuls",status:"failed",scanJobId:process.env.NETRA_SJ||null,findings:[],summary:{total:0,critical:0,high:0,medium:0,low:0,info:1},error:{code:process.env.NETRA_CODE,reason:process.env.NETRA_REASON}};process.stdout.write(JSON.stringify(o));' \
    2>/dev/null || printf '{"toolName":"vuls","status":"failed","findings":[],"error":{"code":"%s"}}' "$1"
  printf '\n###VULS_JSON_END###\n'
}

[ -n "$SCAN_JOB_ID" ] || { fail_json "MISSING_SCAN_JOB_ID" "scan-job-id is required"; exit 2; }

RUN_DIR="$WORK_DIR/runs/$SCAN_JOB_ID"
mkdir -p "$RUN_DIR/results" "$RUN_DIR/tmp"

# ─── assemble targets file ───
TGT_JSON="$RUN_DIR/tmp/vuls_targets.json"
if [ -n "$TARGETS_FILE" ]; then
  [ -f "$TARGETS_FILE" ] || { fail_json "TARGETS_FILE_NOT_FOUND" "targets-file not found: $TARGETS_FILE"; exit 2; }
  cp "$TARGETS_FILE" "$TGT_JSON"
elif [ -n "$SINGLE_TARGET" ] && [ -n "$SINGLE_USER" ]; then
  NETRA_IP="$SINGLE_TARGET" NETRA_USER="$SINGLE_USER" NETRA_PORT="$SINGLE_PORT" \
  NETRA_LEGACY="$SINGLE_LEGACY" NETRA_SJ="$SCAN_JOB_ID" "$NODE_BIN" -e \
    'const t=[{ip:process.env.NETRA_IP,target:process.env.NETRA_IP,sshUser:process.env.NETRA_USER,username:process.env.NETRA_USER,sshPort:Number(process.env.NETRA_PORT||22),legacySsh:/^true$/i.test(process.env.NETRA_LEGACY||""),serverLabel:"target_"+String(process.env.NETRA_IP).replace(/[^A-Za-z0-9]/g,"_"),scanJobId:process.env.NETRA_SJ}];process.stdout.write(JSON.stringify(t));' \
    > "$TGT_JSON"
else
  fail_json "MISSING_TARGETS" "provide --targets-file or --target/--ssh-user"; exit 2
fi

# ─── re-validate every target IP (defence in depth) ───
IPS=$("$NODE_BIN" -e 'const fs=require("fs");const a=JSON.parse(fs.readFileSync(process.argv[1],"utf8")||"[]");process.stdout.write(a.map(t=>t.ip||t.target||t.target_ip||"").filter(Boolean).join("\n"));' "$TGT_JSON")
for ip in $IPS; do
  if ! "$NODE_BIN" "$VALIDATOR" "$ip" 2>/tmp/netra_validate.$$; then
    REASON=$(cat /tmp/netra_validate.$$ 2>/dev/null || true)
    rm -f /tmp/netra_validate.$$
    fail_json "TARGET_REJECTED" "${REASON:-$ip failed scope validation}"
    exit 4
  fi
done
rm -f /tmp/netra_validate.$$

[ -d "$WORK_DIR" ] || { fail_json "WORK_DIR_NOT_FOUND" "VULS_DIR not found: $WORK_DIR"; exit 5; }

# ─── locate SSH key (key-based only; never a password) ───
KEY_HOST="${VULS_SSH_KEY:-$HOME/.ssh/vuls_n8n/id_rsa}"
[ -f "$KEY_HOST" ] || KEY_HOST="$HOME/.ssh/id_rsa"
if [ ! -f "$KEY_HOST" ]; then
  fail_json "SSH_KEY_NOT_FOUND" "No SSH private key (set VULS_SSH_KEY or ~/.ssh/id_rsa)"; exit 5
fi
chmod 600 "$KEY_HOST" 2>/dev/null || true

cd "$RUN_DIR"

DOCKER_BIN="$(command -v docker 2>/dev/null || true)"
VULS_BIN="$(command -v vuls 2>/dev/null || true)"
if [ -n "$DOCKER_BIN" ]; then
  RUN_MODE="docker"; KEY_IN_CONFIG="/tmp/vuls_id_rsa"; KNOWN_IN_CONFIG="/root/.ssh/known_hosts"
elif [ -n "$VULS_BIN" ]; then
  RUN_MODE="native"; KEY_IN_CONFIG="$KEY_HOST"; KNOWN_IN_CONFIG="$RUN_DIR/tmp/known_hosts"
else
  fail_json "NO_VULS_RUNTIME" "Neither docker nor vuls binary found on the runner"; exit 5
fi

export RUN_MODE KEY_IN_CONFIG KNOWN_IN_CONFIG

# ─── generate strict known_hosts + config.toml (scanMode fast / non-exploit) ───
"$PYTHON_BIN" - "$TGT_JSON" <<'PY'
import json, os, re, subprocess, sys
from pathlib import Path

targets = json.loads(Path(sys.argv[1]).read_text() or "[]")
if not isinstance(targets, list) or not targets:
    raise SystemExit("No targets")

def safe(v):
    v = re.sub(r"[^A-Za-z0-9_]", "_", str(v or "target"))
    return re.sub(r"_+", "_", v).strip("_") or "target"

known = Path("tmp/known_hosts"); known.write_text("")
seen = set(); norm = []
for i, t in enumerate(targets):
    ip = str(t.get("ip") or t.get("target") or t.get("target_ip") or "").strip()
    user = str(t.get("sshUser") or t.get("username") or t.get("ssh_user") or "").strip()
    port = int(t.get("sshPort") or t.get("ssh_port") or 22)
    if not ip or not user:
        raise SystemExit(f"Missing ip/user at index {i}")
    name = safe(t.get("serverLabel") or t.get("serverName") or f"target_{ip}")
    base = name; n = 2
    while name in seen:
        name = f"{base}_{n}"; n += 1
    seen.add(name)
    with known.open("a") as f:
        subprocess.run(["ssh-keyscan", "-p", str(port), ip], stdout=f, stderr=subprocess.DEVNULL)
    norm.append({**t, "ip": ip, "sshUser": user, "sshPort": port, "serverLabel": name,
                 "legacySsh": bool(t.get("legacySsh", False))})

Path(sys.argv[1]).write_text(json.dumps(norm, ensure_ascii=False))

cfg = "[servers]\n\n"
for t in norm:
    opts = ['"-F"','"/dev/null"','"-o"','"StrictHostKeyChecking=yes"','"-o"',
            f'"UserKnownHostsFile={os.environ["KNOWN_IN_CONFIG"]}"']
    if t.get("legacySsh"):
        opts += ['"-o"','"HostKeyAlgorithms=+ssh-rsa"','"-o"','"PubkeyAcceptedAlgorithms=+ssh-rsa"']
    cfg += (f'[servers.{t["serverLabel"]}]\nhost = "{t["ip"]}"\nport = "{t["sshPort"]}"\n'
            f'user = "{t["sshUser"]}"\nkeyPath = "{os.environ["KEY_IN_CONFIG"]}"\n'
            f'sshConfigPath = "/dev/null"\nscanMode = ["fast"]\nsshOption = [\n  '
            + ", ".join(opts) + "\n]\n\n")
Path("config.toml").write_text(cfg)
PY

run_vuls() {
  if [ "$RUN_MODE" = "docker" ]; then
    "$DOCKER_BIN" run --rm -i \
      -v "$RUN_DIR:/vuls" \
      -v "$KEY_HOST:/tmp/vuls_id_rsa:ro" \
      -v "$RUN_DIR/tmp/known_hosts:/root/.ssh/known_hosts:ro" \
      vuls/vuls "$@"
  else
    "$VULS_BIN" "$@"
  fi
}

if [ "$RUN_MODE" = "docker" ]; then CONFIG_PATH="/vuls/config.toml"; RESULTS_DIR="/vuls/results";
else CONFIG_PATH="$RUN_DIR/config.toml"; RESULTS_DIR="$RUN_DIR/results"; fi

CT=0; SC=0; RP=0
run_vuls configtest -config="$CONFIG_PATH" > tmp/configtest.log 2>&1 || CT=$?
run_vuls scan -config="$CONFIG_PATH" -results-dir="$RESULTS_DIR" > tmp/scan.log 2>&1 || SC=$?
run_vuls report -config="$CONFIG_PATH" -results-dir="$RESULTS_DIR" -format-json -to-localfile > tmp/report.log 2>&1 || RP=$?

printf '###VULS_JSON_START###\n'
"$PYTHON_BIN" - "$TGT_JSON" "$CT" "$SC" "$RP" <<'PY'
import json, re, sys
from pathlib import Path

targets = json.loads(Path(sys.argv[1]).read_text() or "[]")
ct, sc, rp = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])

def to_float(v):
    try:
        if isinstance(v,(int,float)):
            n=float(v); return n if 0<=n<=10 else None
        m=re.search(r"\b(\d+(?:\.\d+)?)\b", str(v));
        if not m: return None
        n=float(m.group(1)); return n if 0<=n<=10 else None
    except Exception: return None

def sev_from(score):
    n=to_float(score)
    if n is None: return "LOW"
    return "CRITICAL" if n>=9 else "HIGH" if n>=7 else "MEDIUM" if n>=4 else "LOW"

def walk(o):
    if isinstance(o,dict):
        yield o
        for v in o.values(): yield from walk(v)
    elif isinstance(o,list):
        for v in o: yield from walk(v)

def pick(cve):
    scores=[];
    for d in walk(cve):
        for k,v in d.items():
            if str(k).lower().endswith("score"):
                n=to_float(v)
                if n is not None: scores.append(n)
    if scores:
        b=max(scores); return b, sev_from(b)
    return 0.1, "LOW"

def summary_text(cve):
    for k in ["summary","description","title","message"]:
        if isinstance(cve,dict) and cve.get(k): return str(cve[k])[:1500]
    return "Vuls detected a vulnerability on the target host."

def remediation_text(cve):
    aff=cve.get("affectedPackages") if isinstance(cve,dict) else None
    if isinstance(aff,dict) and aff: return "Update affected packages: "+", ".join(list(aff.keys())[:10])
    return "Review affected packages and apply vendor security updates."

def iter_servers(data):
    if isinstance(data,dict):
        if any(k in data for k in ["scannedCves","cves","vulnerabilities"]):
            yield data.get("serverName") or data.get("host") or "target", data; return
        for name,val in data.items():
            if isinstance(val,dict) and any(k in val for k in ["scannedCves","cves","vulnerabilities"]):
                val=dict(val); val.setdefault("serverName",name); yield name,val

tmap={t.get("serverLabel"):t for t in targets if t.get("serverLabel")}
files=sorted(str(p) for p in Path("results").rglob("*.json"))
findings=[]; seen=set()
for fp in files:
    try: data=json.loads(Path(fp).read_text(encoding="utf-8",errors="ignore"))
    except Exception: continue
    for sname,server in iter_servers(data):
        mapped=tmap.get(sname,{}); ip=mapped.get("ip") or server.get("ip") or server.get("host") or sname
        scanned=server.get("scannedCves") or server.get("cves") or server.get("vulnerabilities") or {}
        items=scanned.items() if isinstance(scanned,dict) else (
            [(c.get("cveID") or c.get("cveId") or c.get("id") or "Unknown CVE",c) for c in scanned if isinstance(c,dict)]
            if isinstance(scanned,list) else [])
        for cid,cve in items:
            key=f"{sname}|{ip}|{cid}"
            if key in seen: continue
            seen.add(key)
            score,sev=pick(cve if isinstance(cve,dict) else {})
            findings.append({"title":str(cid)[:200],"severity":sev,
                "description":summary_text(cve if isinstance(cve,dict) else {}),
                "remediation":remediation_text(cve if isinstance(cve,dict) else {}),
                "target":str(ip),"status":"OPEN","cvss":float(score),"tool":"vuls"})

summary={"total":len(findings),
    "critical":sum(1 for f in findings if f["severity"]=="CRITICAL"),
    "high":sum(1 for f in findings if f["severity"]=="HIGH"),
    "medium":sum(1 for f in findings if f["severity"]=="MEDIUM"),
    "low":sum(1 for f in findings if f["severity"]=="LOW"),"info":0}
status = "failed" if (ct or sc or rp or not files) else "completed"
payload={"toolName":"vuls","status":status,
    "target": targets[0]["ip"] if len(targets)==1 else "multiple",
    "findings":findings,"summary":summary,
    "meta":{"scanJobId":targets[0].get("scanJobId") if targets else None,
            "configtestCode":ct,"scanCode":sc,"reportCode":rp,"reportFiles":files}}
if status=="failed": payload["error"]="Vuls scan failed. Check runner logs in the run directory."
print(json.dumps(payload, ensure_ascii=False))
PY
printf '\n###VULS_JSON_END###\n'

exit 0
