#!/usr/bin/env node
// Fails if an exported n8n workflow contains live-looking secrets.
// Usage: node scripts/check-n8n-workflow-secrets.mjs <workflow.json> [more.json ...]
//
// A match is allowed (not a finding) when its line also contains an env
// reference, an n8n expression, or an explicit REPLACE_WITH_ placeholder.
import fs from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node scripts/check-n8n-workflow-secrets.mjs <workflow.json> [...]");
  process.exit(2);
}

// If a line contains any of these, a pattern hit on that line is a placeholder
// / env reference, not a real secret.
const ALLOW = ["REPLACE_WITH_", "$env.", "process.env", "{{", "SANITIZED_N8N_INSTANCE_ID"];

const PATTERNS = [
  [/sk-ant-[A-Za-z0-9_-]{8,}/g, "anthropic-key"],
  [/sk-[A-Za-z0-9]{16,}/g, "openai-key"],
  [/metlo\.[A-Za-z0-9+/=]{8,}/g, "metlo-token"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/g, "private-key"],
  [/Basic [A-Za-z0-9+\/]{8,}={0,2}/g, "basic-auth"],
  [/Bearer [A-Za-z0-9._-]{12,}/gi, "bearer-token"],
  [/"X-API-Key"\s*:\s*"[A-Za-z0-9+\/_-]{12,}"/g, "hardcoded-x-api-key"],
  [/[0-9a-fA-F]{40,}/g, "long-high-entropy-hex"],
];

let totalFindings = 0;

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    console.error(`[${file}] cannot read: ${e.message}`);
    process.exit(2);
  }

  try {
    JSON.parse(text);
  } catch (e) {
    console.error(`[${file}] INVALID JSON: ${e.message}`);
    process.exit(2);
  }

  const lines = text.split(/\r?\n/);
  const findings = [];
  lines.forEach((line, i) => {
    if (ALLOW.some((a) => line.includes(a))) return;
    for (const [re, label] of PATTERNS) {
      re.lastIndex = 0;
      const m = re.exec(line);
      if (m) {
        const snippet = m[0].length > 16 ? m[0].slice(0, 12) + "…(redacted)" : m[0];
        findings.push(`  line ${i + 1} [${label}]: ${snippet}`);
      }
    }
  });

  if (findings.length) {
    totalFindings += findings.length;
    console.error(`[${file}] ✗ ${findings.length} potential secret(s):`);
    findings.forEach((f) => console.error(f));
  } else {
    console.log(`[${file}] ✓ no live-looking secrets`);
  }
}

process.exit(totalFindings > 0 ? 1 : 0);
