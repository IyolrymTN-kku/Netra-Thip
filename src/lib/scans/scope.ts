// Scan scope validation — deny-by-default authorization for scan targets.
//
// Every scan MUST pass `validateScanTarget` before a ScanJob is created or any
// payload is dispatched to n8n. The model is:
//
//   1. Reject inputs that expand to more than `maxTargets` hosts BEFORE
//      materialising any list (CIDR/range/wildcard size is computed
//      arithmetically — never by allocating an array).
//   2. Reject hard-dangerous targets (cloud metadata, loopback, link-local).
//   3. Reject public/globally-routable targets unless `allowPublic` is set.
//   4. Reject anything not explicitly covered by the allowlist (deny by
//      default). The denylist always wins over the allowlist.
//
// Strict parsing is itself a defence: a token that is not a clean IP / CIDR /
// range / wildcard / hostname / URL is rejected, so shell metacharacters and
// other injection payloads never reach a runner.
//
// IPv4 is fully supported. IPv6 literals are handled conservatively
// (loopback / link-local / ULA recognised; everything else treated as public).

import { expandTargets } from "./target-parser";

export type TargetKind = "ip" | "cidr" | "range" | "wildcard" | "domain" | "url";

export interface ParsedTarget {
  raw: string;
  kind: TargetKind;
  /** Hostname for domain/url, or the IP literal for ip targets. */
  host: string | null;
  /** Numeric IPv4 start (inclusive), or null for non-IPv4 targets. */
  ipStart: number | null;
  /** Numeric IPv4 end (inclusive), or null for non-IPv4 targets. */
  ipEnd: number | null;
  /** Number of hosts this token represents. */
  count: number;
  isIpv4: boolean;
}

export interface ScopePolicy {
  /** CIDRs / IPs and/or domain suffixes that are explicitly in scope. */
  allowlist: string[];
  /** CIDRs / IPs and/or domain suffixes that are always out of scope. */
  denylist: string[];
  /** Max hosts a single scan may expand to. */
  maxTargets: number;
  /** Allow public / globally-routable targets. Keep false for pre-prod. */
  allowPublic: boolean;
}

export type ScopeCode =
  | "EMPTY_INPUT"
  | "UNPARSEABLE_TARGET"
  | "TOO_MANY_TARGETS"
  | "METADATA_IP_DENIED"
  | "LOOPBACK_DENIED"
  | "LINK_LOCAL_DENIED"
  | "PUBLIC_TARGET_DENIED"
  | "DENYLISTED"
  | "NOT_IN_ALLOWLIST";

export interface ScopeAcceptance {
  ok: true;
  estimatedCount: number;
  tokens: ParsedTarget[];
}

export interface ScopeRejection {
  ok: false;
  code: ScopeCode;
  reason: string;
  token?: string;
  estimatedCount?: number;
}

export type ScopeResult = ScopeAcceptance | ScopeRejection;

export class ScopeError extends Error {
  code: ScopeCode;
  constructor(code: ScopeCode, message: string) {
    super(message);
    this.name = "ScopeError";
    this.code = code;
  }
}

// ─────────── Low-level IPv4 helpers ───────────

const OCTET = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4_RE = new RegExp(`^${OCTET}(\\.${OCTET}){3}$`);
// RFC 1123 hostname (labels 1-63 chars, total <=253, no leading/trailing hyphen).
const HOSTNAME_RE =
  /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function ipv4ToInt(ip: string): number | null {
  if (!IPV4_RE.test(ip)) return null;
  return (
    ip.split(".").reduce((acc, oct) => ((acc << 8) + parseInt(oct, 10)) >>> 0, 0) >>>
    0
  );
}

function intToIpv4(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

interface IntRange {
  start: number;
  end: number;
}

function cidrToRange(base: string, prefix: number): IntRange | null {
  const baseInt = ipv4ToInt(base);
  if (baseInt === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return null;
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const start = (baseInt & mask) >>> 0;
  const end = (start + (2 ** (32 - prefix) - 1)) >>> 0;
  return { start, end };
}

// Non-public (private / reserved / special-use) IPv4 blocks. Used both to
// detect public targets and to keep metadata/loopback/link-local out.
const NON_PUBLIC_CIDRS: IntRange[] = [
  cidrToRange("0.0.0.0", 8),
  cidrToRange("10.0.0.0", 8),
  cidrToRange("100.64.0.0", 10), // CGNAT
  cidrToRange("127.0.0.0", 8), // loopback
  cidrToRange("169.254.0.0", 16), // link-local (incl. metadata)
  cidrToRange("172.16.0.0", 12),
  cidrToRange("192.0.0.0", 24),
  cidrToRange("192.0.2.0", 24), // TEST-NET-1
  cidrToRange("192.168.0.0", 16),
  cidrToRange("198.18.0.0", 15), // benchmarking
  cidrToRange("198.51.100.0", 24), // TEST-NET-2
  cidrToRange("203.0.113.0", 24), // TEST-NET-3
  cidrToRange("224.0.0.0", 4), // multicast
  cidrToRange("240.0.0.0", 4), // reserved
].filter((r): r is IntRange => r !== null);

const LOOPBACK_V4 = cidrToRange("127.0.0.0", 8)!;
const LINK_LOCAL_V4 = cidrToRange("169.254.0.0", 16)!;
const METADATA_V4 = cidrToRange("169.254.169.254", 32)!;

function rangesIntersect(a: IntRange, b: IntRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

function rangeWithin(inner: IntRange, outer: IntRange): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

/** True when no IP in [start,end] is public (the whole range sits in one reserved block). */
function rangeIsFullyNonPublic(range: IntRange): boolean {
  return NON_PUBLIC_CIDRS.some((cidr) => rangeWithin(range, cidr));
}

// ─────────── IPv6 helpers (conservative) ───────────

function isIpv6Literal(value: string): boolean {
  // Good-enough detector: contains ":" and only hex/colon/dot chars.
  return value.includes(":") && /^[0-9a-fA-F:.]+$/.test(value);
}

function normaliseIpv6(value: string): string {
  return value.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
}

function ipv6IsLoopback(v: string): boolean {
  const n = normaliseIpv6(v);
  return n === "::1";
}

function ipv6IsLinkLocal(v: string): boolean {
  return /^fe[89ab][0-9a-f]:/.test(normaliseIpv6(v));
}

function ipv6IsUniqueLocal(v: string): boolean {
  return /^f[cd][0-9a-f]{2}:/.test(normaliseIpv6(v));
}

function ipv6IsMetadata(v: string): boolean {
  return normaliseIpv6(v) === "fd00:ec2::254";
}

// ─────────── Category predicates (exported) ───────────

export function isLoopbackIp(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n !== null) return n >= LOOPBACK_V4.start && n <= LOOPBACK_V4.end;
  if (isIpv6Literal(ip)) return ipv6IsLoopback(ip);
  return false;
}

export function isLinkLocalIp(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n !== null) return n >= LINK_LOCAL_V4.start && n <= LINK_LOCAL_V4.end;
  if (isIpv6Literal(ip)) return ipv6IsLinkLocal(ip);
  return false;
}

export function isMetadataIp(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n !== null) return n === METADATA_V4.start;
  if (isIpv6Literal(ip)) return ipv6IsMetadata(ip);
  return false;
}

/** True when the IP is public / globally-routable (and therefore blocked by default). */
export function isPublicIpBlocked(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n !== null) return !rangeIsFullyNonPublic({ start: n, end: n });
  if (isIpv6Literal(ip)) {
    return !(
      ipv6IsLoopback(ip) ||
      ipv6IsLinkLocal(ip) ||
      ipv6IsUniqueLocal(ip) ||
      ipv6IsMetadata(ip)
    );
  }
  return false;
}

// ─────────── Token parsing ───────────

function tokenize(input: string): string[] {
  // Mirror target-parser.expandTargets so validation and materialisation agree:
  // normalise "IP - IP" / "IP - 50" then split on whitespace and commas.
  return input
    .replace(/\s*-\s*/g, "-")
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function wildcardToCidr(token: string): string | null {
  if (token.endsWith(".*.*.*")) return token.replace(".*.*.*", ".0.0.0/8");
  if (token.endsWith(".*.*")) return token.replace(".*.*", ".0.0/16");
  if (token.endsWith(".*")) return token.replace(".*", ".0/24");
  return null;
}

function ipTarget(raw: string, kind: TargetKind, range: IntRange, host: string | null): ParsedTarget {
  return {
    raw,
    kind,
    host,
    ipStart: range.start,
    ipEnd: range.end,
    count: range.end - range.start + 1,
    isIpv4: true,
  };
}

/** Parse a single token. Returns null for anything that is not a clean target. */
export function parseTarget(input: string): ParsedTarget | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  // URL
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }
    const host = url.hostname;
    if (!host) return null;
    const ipInt = ipv4ToInt(host);
    if (ipInt !== null) {
      return ipTarget(raw, "url", { start: ipInt, end: ipInt }, host);
    }
    if (host.startsWith("[") && host.endsWith("]") && isIpv6Literal(host)) {
      return { raw, kind: "url", host: normaliseIpv6(host), ipStart: null, ipEnd: null, count: 1, isIpv4: false };
    }
    if (HOSTNAME_RE.test(host)) {
      return { raw, kind: "url", host, ipStart: null, ipEnd: null, count: 1, isIpv4: false };
    }
    return null;
  }

  // CIDR
  if (raw.includes("/")) {
    const [base, prefixText, ...rest] = raw.split("/");
    if (rest.length > 0) return null;
    const prefix = Number(prefixText);
    if (!/^\d{1,2}$/.test(prefixText ?? "")) return null;
    const range = cidrToRange(base, prefix);
    if (!range) return null;
    return ipTarget(raw, "cidr", range, null);
  }

  // Wildcard (e.g. 192.168.1.*)
  if (raw.includes("*")) {
    const cidr = wildcardToCidr(raw);
    if (!cidr) return null;
    const [base, prefixText] = cidr.split("/");
    const range = cidrToRange(base, Number(prefixText));
    if (!range) return null;
    return ipTarget(raw, "wildcard", range, null);
  }

  // Range (192.168.1.1-50 or 192.168.1.1-192.168.1.50) — hyphens already tightened.
  if (raw.includes("-")) {
    const [start, end] = raw.split("-");
    const startInt = ipv4ToInt(start ?? "");
    if (startInt === null) return null;
    let endStr = end ?? "";
    if (endStr && !endStr.includes(".")) {
      const parts = (start ?? "").split(".");
      endStr = `${parts[0]}.${parts[1]}.${parts[2]}.${endStr}`;
    }
    const endInt = ipv4ToInt(endStr);
    if (endInt === null || endInt < startInt) return null;
    return ipTarget(raw, "range", { start: startInt, end: endInt }, null);
  }

  // Single IPv4
  const ipInt = ipv4ToInt(raw);
  if (ipInt !== null) {
    return ipTarget(raw, "ip", { start: ipInt, end: ipInt }, raw);
  }

  // A dotted-quad that is NOT a valid IPv4 (e.g. 999.1.1.1, 256.0.0.1) is a
  // malformed address, not a hostname — reject rather than mis-classify.
  if (/^\d+(\.\d+){3}$/.test(raw)) return null;

  // IPv6 literal
  if (isIpv6Literal(raw)) {
    return { raw, kind: "ip", host: normaliseIpv6(raw), ipStart: null, ipEnd: null, count: 1, isIpv4: false };
  }

  // Hostname
  if (HOSTNAME_RE.test(raw)) {
    return { raw, kind: "domain", host: raw, ipStart: null, ipEnd: null, count: 1, isIpv4: false };
  }

  return null;
}

/**
 * Count the hosts an input expands to WITHOUT allocating any list.
 * Used to reject huge CIDRs/wildcards before materialisation.
 */
export function estimateTargetCount(input: string): number {
  let total = 0;
  for (const token of tokenize(input ?? "")) {
    const parsed = parseTarget(token);
    total += parsed ? parsed.count : 0;
  }
  return total;
}

/**
 * Expand an input to a concrete list, but refuse (throwing ScopeError) if the
 * arithmetic count exceeds maxTargets — so we never build a giant array.
 */
export function expandTargetsSafe(input: string, maxTargets: number): string[] {
  const count = estimateTargetCount(input);
  if (count > maxTargets) {
    throw new ScopeError(
      "TOO_MANY_TARGETS",
      `Refusing to expand ${count} targets (max ${maxTargets}).`,
    );
  }
  return expandTargets(input);
}

// ─────────── Scope rules (allowlist / denylist) ───────────

type ScopeRule =
  | { type: "ip"; range: IntRange }
  | { type: "domain"; suffix: string };

function parseScopeEntry(entry: string): ScopeRule | null {
  const raw = entry.trim();
  if (!raw) return null;

  if (raw.includes("/")) {
    const [base, prefixText] = raw.split("/");
    const range = cidrToRange(base ?? "", Number(prefixText));
    return range ? { type: "ip", range } : null;
  }
  const ipInt = ipv4ToInt(raw);
  if (ipInt !== null) {
    return { type: "ip", range: { start: ipInt, end: ipInt } };
  }
  // Allow a leading wildcard "*.example.com" as a domain suffix.
  const suffix = raw.replace(/^\*\./, "").toLowerCase();
  if (HOSTNAME_RE.test(suffix)) {
    return { type: "domain", suffix };
  }
  return null;
}

function domainMatches(host: string, suffix: string): boolean {
  const h = host.toLowerCase();
  return h === suffix || h.endsWith(`.${suffix}`);
}

/** True when the target is fully covered by at least one allowlist entry. */
export function isAllowedByScope(target: string, allowlist: string[]): boolean {
  const parsed = parseTarget(target);
  if (!parsed) return false;
  const rules = allowlist.map(parseScopeEntry).filter((r): r is ScopeRule => r !== null);

  if (parsed.isIpv4 && parsed.ipStart !== null && parsed.ipEnd !== null) {
    const tRange: IntRange = { start: parsed.ipStart, end: parsed.ipEnd };
    return rules.some((r) => r.type === "ip" && rangeWithin(tRange, r.range));
  }
  if (parsed.host) {
    return rules.some((r) => r.type === "domain" && domainMatches(parsed.host as string, r.suffix));
  }
  return false;
}

/** True when the target intersects any denylist entry (deny wins). */
export function isDeniedByScope(target: string, denylist: string[]): boolean {
  const parsed = parseTarget(target);
  if (!parsed) return false;
  const rules = denylist.map(parseScopeEntry).filter((r): r is ScopeRule => r !== null);

  if (parsed.isIpv4 && parsed.ipStart !== null && parsed.ipEnd !== null) {
    const tRange: IntRange = { start: parsed.ipStart, end: parsed.ipEnd };
    return rules.some((r) => r.type === "ip" && rangesIntersect(tRange, r.range));
  }
  if (parsed.host) {
    return rules.some((r) => r.type === "domain" && domainMatches(parsed.host as string, r.suffix));
  }
  return false;
}

// ─────────── Public entry point ───────────

function reject(code: ScopeCode, reason: string, token?: string, estimatedCount?: number): ScopeRejection {
  return { ok: false, code, reason, token, estimatedCount };
}

/**
 * Validate a raw target input string against a scope policy.
 * Deny-by-default: anything not explicitly allowed is rejected.
 */
export function validateScanTarget(input: string, policy: ScopePolicy): ScopeResult {
  const raw = (input ?? "").trim();
  if (!raw) return reject("EMPTY_INPUT", "No target supplied.");

  const tokens = tokenize(raw);
  if (tokens.length === 0) return reject("EMPTY_INPUT", "No target supplied.");

  // (1) Reject oversized inputs BEFORE any expansion/allocation.
  const estimatedCount = estimateTargetCount(raw);
  if (estimatedCount > policy.maxTargets) {
    return reject(
      "TOO_MANY_TARGETS",
      `Target expands to ${estimatedCount} hosts which exceeds the limit of ${policy.maxTargets}.`,
      undefined,
      estimatedCount,
    );
  }

  const parsedTokens: ParsedTarget[] = [];

  for (const token of tokens) {
    const parsed = parseTarget(token);
    if (!parsed) {
      return reject("UNPARSEABLE_TARGET", `"${token}" is not a valid IP, CIDR, range, hostname, or URL.`, token);
    }

    // (2) Denylist always wins.
    if (isDeniedByScope(token, policy.denylist)) {
      return reject("DENYLISTED", `"${token}" is explicitly denied by scan scope policy.`, token);
    }

    // (3) Hard-dangerous categories.
    if (parsed.isIpv4 && parsed.ipStart !== null && parsed.ipEnd !== null) {
      const tRange: IntRange = { start: parsed.ipStart, end: parsed.ipEnd };
      if (rangesIntersect(tRange, METADATA_V4)) {
        return reject("METADATA_IP_DENIED", `"${token}" targets the cloud metadata address.`, token);
      }
      if (rangesIntersect(tRange, LOOPBACK_V4)) {
        return reject("LOOPBACK_DENIED", `"${token}" targets loopback.`, token);
      }
      if (rangesIntersect(tRange, LINK_LOCAL_V4)) {
        return reject("LINK_LOCAL_DENIED", `"${token}" targets a link-local address.`, token);
      }
      if (!policy.allowPublic && !rangeIsFullyNonPublic(tRange)) {
        return reject("PUBLIC_TARGET_DENIED", `"${token}" includes public/globally-routable addresses.`, token);
      }
    } else if (parsed.kind === "ip" && parsed.host) {
      // IPv6 literal
      if (isMetadataIp(parsed.host)) return reject("METADATA_IP_DENIED", `"${token}" targets the cloud metadata address.`, token);
      if (isLoopbackIp(parsed.host)) return reject("LOOPBACK_DENIED", `"${token}" targets loopback.`, token);
      if (isLinkLocalIp(parsed.host)) return reject("LINK_LOCAL_DENIED", `"${token}" targets a link-local address.`, token);
      if (!policy.allowPublic && isPublicIpBlocked(parsed.host)) {
        return reject("PUBLIC_TARGET_DENIED", `"${token}" includes public/globally-routable addresses.`, token);
      }
    } else if (parsed.host) {
      // Hostname target — treat "localhost" family as loopback.
      const h = parsed.host.toLowerCase();
      if (h === "localhost" || h.endsWith(".localhost")) {
        return reject("LOOPBACK_DENIED", `"${token}" resolves to loopback.`, token);
      }
    }

    // (4) Deny by default — must match the allowlist.
    if (!isAllowedByScope(token, policy.allowlist)) {
      return reject(
        "NOT_IN_ALLOWLIST",
        `"${token}" is not covered by the scan scope allowlist (SCAN_SCOPE_ALLOWLIST).`,
        token,
      );
    }

    parsedTokens.push(parsed);
  }

  return { ok: true, estimatedCount, tokens: parsedTokens };
}

/** Load scope policy from environment variables. Defaults to deny-everything. */
export function loadScopePolicy(
  env: Record<string, string | undefined> = process.env,
): ScopePolicy {
  const splitList = (v: string | undefined): string[] =>
    (v ?? "")
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const maxRaw = parseInt(env.SCAN_MAX_TARGETS ?? "", 10);

  return {
    allowlist: splitList(env.SCAN_SCOPE_ALLOWLIST),
    denylist: splitList(env.SCAN_SCOPE_DENYLIST),
    maxTargets: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : 256,
    allowPublic: /^true$/i.test(env.SCAN_ALLOW_PUBLIC_TARGETS ?? ""),
  };
}

// Helper exported mainly for symmetry with the discovery spec; `intToIpv4` is
// used internally by target expansion utilities.
export { intToIpv4 };
