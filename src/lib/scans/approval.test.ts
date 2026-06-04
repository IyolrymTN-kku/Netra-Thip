import { describe, expect, it } from "vitest";
import {
  isApproved,
  isOffensiveWorkflow,
  requiresApproval,
} from "./approval";

describe("requiresApproval", () => {
  it("AutoPentestX always requires approval", () => {
    expect(requiresApproval("autopentestx", {})).toBe(true);
    expect(requiresApproval("autopentestx", { approved: true })).toBe(true);
  });

  it("Guardian offensive/deep workflows require approval", () => {
    expect(requiresApproval("guardian", { workflow_name: "network_pentest" })).toBe(true);
    expect(requiresApproval("guardian", { workflow_name: "web_pentest" })).toBe(true);
    expect(requiresApproval("guardian", { workflow_name: "full_vuln_scan" })).toBe(true);
    expect(requiresApproval("guardian", { workflow_name: "autonomus" })).toBe(true);
    expect(requiresApproval("guardian", { workflow_name: "autonomous" })).toBe(true);
  });

  it("Guardian recon / low-risk workflows do NOT require approval", () => {
    expect(requiresApproval("guardian", { workflow_name: "recon" })).toBe(false);
    expect(requiresApproval("guardian", { workflow_name: "adanvan_recon" })).toBe(false);
    expect(requiresApproval("guardian", { workflow_name: "wordpress_aduit" })).toBe(false);
  });

  it("passive / VA tools never require offensive approval", () => {
    expect(requiresApproval("vuls", {})).toBe(false);
    expect(requiresApproval("metlo", {})).toBe(false);
    expect(requiresApproval("sirius", {})).toBe(false);
    expect(requiresApproval("caido", {})).toBe(false);
  });
});

describe("isApproved", () => {
  it("accepts boolean true and string 'true'", () => {
    expect(isApproved({ approved: true })).toBe(true);
    expect(isApproved({ approved: "true" })).toBe(true);
    expect(isApproved({ approved: "TRUE" })).toBe(true);
  });
  it("rejects everything else", () => {
    expect(isApproved({})).toBe(false);
    expect(isApproved({ approved: false })).toBe(false);
    expect(isApproved({ approved: "false" })).toBe(false);
    expect(isApproved({ approved: "1" })).toBe(false);
  });
});

describe("isOffensiveWorkflow", () => {
  it("matches keywords and explicit names", () => {
    expect(isOffensiveWorkflow("network_pentest")).toBe(true);
    expect(isOffensiveWorkflow("EXPLOIT_chain")).toBe(true);
    expect(isOffensiveWorkflow("brute_attack")).toBe(true);
    expect(isOffensiveWorkflow("full_vuln_scan")).toBe(true);
  });
  it("treats recon as non-offensive", () => {
    expect(isOffensiveWorkflow("recon")).toBe(false);
    expect(isOffensiveWorkflow("")).toBe(false);
    expect(isOffensiveWorkflow(undefined)).toBe(false);
  });
});

describe("route decision (requiresApproval && !isApproved)", () => {
  function blocked(tool: string, params: Record<string, unknown>): boolean {
    return requiresApproval(tool, params) && !isApproved(params);
  }
  it("blocks AutoPentestX without approval, allows with approval", () => {
    expect(blocked("autopentestx", {})).toBe(true);
    expect(blocked("autopentestx", { approved: true })).toBe(false);
  });
  it("blocks Guardian offensive workflow without approval", () => {
    expect(blocked("guardian", { workflow_name: "network_pentest" })).toBe(true);
    expect(blocked("guardian", { workflow_name: "network_pentest", approved: "true" })).toBe(false);
  });
  it("does not block Guardian recon", () => {
    expect(blocked("guardian", { workflow_name: "recon" })).toBe(false);
  });
});
