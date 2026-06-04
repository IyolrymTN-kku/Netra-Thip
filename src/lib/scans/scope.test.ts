import { describe, expect, it } from "vitest";
import {
  estimateTargetCount,
  expandTargetsSafe,
  isLinkLocalIp,
  isLoopbackIp,
  isMetadataIp,
  isPublicIpBlocked,
  loadScopePolicy,
  parseTarget,
  ScopeError,
  validateScanTarget,
  type ScopePolicy,
} from "./scope";

// Default policy used by most tests: private RFC1918 ranges + one domain are in
// scope, public is blocked, max 256 hosts.
function policy(overrides: Partial<ScopePolicy> = {}): ScopePolicy {
  return {
    allowlist: ["10.0.0.0/8", "192.168.0.0/16", "172.16.0.0/12", "lab.internal"],
    denylist: [],
    maxTargets: 256,
    allowPublic: false,
    ...overrides,
  };
}

describe("parseTarget", () => {
  it("classifies the supported target kinds", () => {
    expect(parseTarget("10.0.0.5")?.kind).toBe("ip");
    expect(parseTarget("10.0.0.0/24")?.kind).toBe("cidr");
    expect(parseTarget("10.0.0.1-10.0.0.10")?.kind).toBe("range");
    expect(parseTarget("10.0.0.*")?.kind).toBe("wildcard");
    expect(parseTarget("host.lab.internal")?.kind).toBe("domain");
    expect(parseTarget("http://10.0.0.5:6010")?.kind).toBe("url");
  });

  it("extracts the host from a URL and detects IP-literal URLs", () => {
    expect(parseTarget("http://host.lab.internal/path")?.host).toBe("host.lab.internal");
    const ipUrl = parseTarget("http://8.8.8.8:80");
    expect(ipUrl?.isIpv4).toBe(true);
    expect(ipUrl?.host).toBe("8.8.8.8");
  });

  it("rejects shell-metacharacter / malformed tokens", () => {
    expect(parseTarget("10.0.0.5; rm -rf /")).toBeNull();
    expect(parseTarget("$(curl evil)")).toBeNull();
    expect(parseTarget("`id`")).toBeNull();
    expect(parseTarget("999.1.1.1")).toBeNull();
  });
});

describe("category predicates", () => {
  it("identifies loopback / link-local / metadata / public", () => {
    expect(isLoopbackIp("127.0.0.1")).toBe(true);
    expect(isLoopbackIp("::1")).toBe(true);
    expect(isLinkLocalIp("169.254.1.1")).toBe(true);
    expect(isMetadataIp("169.254.169.254")).toBe(true);
    expect(isPublicIpBlocked("8.8.8.8")).toBe(true);
    expect(isPublicIpBlocked("10.1.2.3")).toBe(false);
  });
});

describe("estimateTargetCount (no allocation)", () => {
  it("counts CIDR / range / wildcard arithmetically", () => {
    expect(estimateTargetCount("10.0.0.5")).toBe(1);
    expect(estimateTargetCount("10.0.0.0/24")).toBe(256);
    expect(estimateTargetCount("10.0.0.1-10.0.0.10")).toBe(10);
    expect(estimateTargetCount("192.168.1.*")).toBe(256);
    // /8 must be computed, not built.
    expect(estimateTargetCount("10.0.0.0/8")).toBe(16_777_216);
    expect(estimateTargetCount("10.*.*.*")).toBe(16_777_216);
  });
});

describe("validateScanTarget — accepts in-scope targets", () => {
  it("single private IP in the allowlist", () => {
    expect(validateScanTarget("10.1.2.3", policy()).ok).toBe(true);
  });
  it("CIDR within the allowlist", () => {
    expect(validateScanTarget("192.168.1.0/24", policy()).ok).toBe(true);
  });
  it("IP range within the allowlist", () => {
    expect(validateScanTarget("10.0.0.1-10.0.0.50", policy()).ok).toBe(true);
  });
  it("allowlisted domain", () => {
    expect(validateScanTarget("host.lab.internal", policy()).ok).toBe(true);
  });
  it("URL whose host is an allowlisted private IP", () => {
    expect(validateScanTarget("http://10.170.100.100:6010", policy()).ok).toBe(true);
  });
});

describe("validateScanTarget — deny by default", () => {
  it("blocks localhost", () => {
    const r = validateScanTarget("localhost", policy());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("LOOPBACK_DENIED");
  });

  it("blocks loopback IP", () => {
    const r = validateScanTarget("127.0.0.1", policy());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("LOOPBACK_DENIED");
  });

  it("blocks the cloud metadata IP", () => {
    const r = validateScanTarget("169.254.169.254", policy());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("METADATA_IP_DENIED");
  });

  it("blocks link-local addresses", () => {
    const r = validateScanTarget("169.254.10.10", policy());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("LINK_LOCAL_DENIED");
  });

  it("blocks public IPs by default", () => {
    const r = validateScanTarget("8.8.8.8", policy());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("PUBLIC_TARGET_DENIED");
  });

  it("does NOT auto-trust a private IP when the allowlist is empty", () => {
    const r = validateScanTarget("10.1.2.3", policy({ allowlist: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_IN_ALLOWLIST");
  });

  it("rejects a target outside the allowlist", () => {
    const r = validateScanTarget("172.32.0.1", policy()); // 172.32 is outside 172.16/12
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("PUBLIC_TARGET_DENIED");
  });

  it("rejects an out-of-allowlist domain", () => {
    const r = validateScanTarget("evil.example.com", policy());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_IN_ALLOWLIST");
  });
});

describe("validateScanTarget — denylist wins", () => {
  it("denylisted IP is rejected even if allowlisted", () => {
    const r = validateScanTarget("10.1.2.3", policy({ denylist: ["10.1.2.3"] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("DENYLISTED");
  });

  it("denylisted sub-range inside an allowlisted CIDR is rejected", () => {
    const r = validateScanTarget("10.9.9.9", policy({ denylist: ["10.9.0.0/16"] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("DENYLISTED");
  });
});

describe("validateScanTarget — oversized inputs rejected before allocation", () => {
  it("rejects a /8 CIDR before expansion", () => {
    const r = validateScanTarget("10.0.0.0/8", policy());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("TOO_MANY_TARGETS");
      expect(r.estimatedCount).toBe(16_777_216);
    }
  });

  it("rejects a triple wildcard before expansion", () => {
    const r = validateScanTarget("10.*.*.*", policy());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("TOO_MANY_TARGETS");
  });
});

describe("expandTargetsSafe", () => {
  it("expands small inputs", () => {
    expect(expandTargetsSafe("10.0.0.0/30", 256)).toEqual([
      "10.0.0.0",
      "10.0.0.1",
      "10.0.0.2",
      "10.0.0.3",
    ]);
  });

  it("throws (without allocating) when the count exceeds the cap", () => {
    expect(() => expandTargetsSafe("10.0.0.0/8", 256)).toThrow(ScopeError);
  });
});

describe("loadScopePolicy", () => {
  it("defaults to deny-everything when env is unset", () => {
    const p = loadScopePolicy({});
    expect(p.allowlist).toEqual([]);
    expect(p.maxTargets).toBe(256);
    expect(p.allowPublic).toBe(false);
  });

  it("parses env lists and flags", () => {
    const p = loadScopePolicy({
      SCAN_SCOPE_ALLOWLIST: "10.0.0.0/8, 192.168.0.0/16",
      SCAN_SCOPE_DENYLIST: "10.9.0.0/16",
      SCAN_MAX_TARGETS: "1024",
      SCAN_ALLOW_PUBLIC_TARGETS: "true",
    });
    expect(p.allowlist).toEqual(["10.0.0.0/8", "192.168.0.0/16"]);
    expect(p.denylist).toEqual(["10.9.0.0/16"]);
    expect(p.maxTargets).toBe(1024);
    expect(p.allowPublic).toBe(true);
  });
});
