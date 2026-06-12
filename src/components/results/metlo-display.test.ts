import { describe, expect, it } from "vitest";
import type { FindingRow } from "./types";
import {
  buildMetloEndpointEntries,
  formatMetloLastActive,
  getMetloEndpointMetadata,
  getMetloDisplayTitle,
} from "./metlo-display";

const baseFinding: FindingRow = {
  id: "finding-1",
  projectId: "project-1",
  scanJobId: "scan-1",
  title: "Metlo Alert - New Endpoint Detected - GET /users",
  severity: "LOW",
  description: "An endpoint was observed in live traffic.",
  remediation: "Review the endpoint.",
  target: "http://127.0.0.1:6001",
  cvss: 0,
  cves: null,
  status: "OPEN",
  createdAt: new Date("2026-06-10T02:00:00.000Z"),
  updatedAt: new Date("2026-06-10T02:00:00.000Z"),
  scanJob: { toolName: "metlo" },
};

describe("Metlo endpoint display helpers", () => {
  it("strips the Metlo alert prefix from endpoint titles", () => {
    expect(getMetloDisplayTitle(baseFinding)).toBe("GET /users");
  });

  it("groups duplicate endpoint findings and keeps the most recent access time", () => {
    const older = {
      ...baseFinding,
      id: "older",
      createdAt: new Date("2026-06-10T01:00:00.000Z"),
      updatedAt: new Date("2026-06-10T01:00:00.000Z"),
    };
    const newer = {
      ...baseFinding,
      id: "newer",
      title: "Metlo Alert - New Endpoint Detected - GET /users?debug=true",
      createdAt: new Date("2026-06-10T03:00:00.000Z"),
      updatedAt: new Date("2026-06-10T03:05:00.000Z"),
    };

    const entries = buildMetloEndpointEntries([older, newer]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.endpointLabel).toBe("GET /users");
    expect(entries[0]?.findings).toHaveLength(2);
    expect(entries[0]?.representative.id).toBe("newer");
    expect(entries[0]?.lastActiveAt.toISOString()).toBe(
      "2026-06-10T03:05:00.000Z",
    );
  });

  it("does not treat a host-only target as an accessed endpoint by itself", () => {
    const entries = buildMetloEndpointEntries([
      {
        ...baseFinding,
        title: "Metlo Alert - Authentication drift",
        description: "A Metlo alert without an endpoint path.",
        target: "http://127.0.0.1:6001",
      },
    ]);

    expect(entries).toHaveLength(0);
  });

  it("reads Metlo endpoint inventory metadata from persisted JSON", () => {
    const metadata = getMetloEndpointMetadata({
      ...baseFinding,
      cves: [
        {
          kind: "metlo-endpoint-metadata",
          riskScore: "none",
          authenticated: true,
          visibility: "private",
          permissions: ["admin", "user"],
          sensitiveData: [{ name: "email" }, "phone"],
          requestCount: 42,
          lastActiveAt: "2026-06-10T03:20:00.000Z",
        },
      ],
    });

    expect(metadata.authenticated).toBe("AUTHENTICATED");
    expect(metadata.visibility).toBe("PRIVATE");
    expect(metadata.permissions).toEqual(["admin", "user"]);
    expect(metadata.sensitiveData).toEqual(["email", "phone"]);
    expect(metadata.piiFieldCount).toBe(2);
    expect(metadata.requestCount).toBe(42);
    expect(metadata.riskScore).toBe("NONE");
    expect(metadata.lastActiveAt?.toISOString()).toBe("2026-06-10T03:20:00.000Z");
  });

  it("formats last active age in Metlo-style words", () => {
    const now = new Date("2026-06-10T04:00:00.000Z");

    expect(formatMetloLastActive(new Date("2026-06-10T03:59:45.000Z"), now)).toBe(
      "15 seconds ago",
    );
    expect(formatMetloLastActive(new Date("2026-06-10T03:45:00.000Z"), now)).toBe(
      "15 minutes ago",
    );
    expect(formatMetloLastActive(new Date("2026-06-10T01:00:00.000Z"), now)).toBe(
      "3 hours ago",
    );
    expect(formatMetloLastActive(new Date("2026-06-08T04:00:00.000Z"), now)).toBe(
      "2 days ago",
    );
  });
});
