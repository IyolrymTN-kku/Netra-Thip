import { describe, expect, it } from "vitest";
import type { FindingInput } from "./schema";
import { getMetloFindingDates } from "./metlo-ingest";

const baseFinding: FindingInput = {
  title: "GET /users",
  severity: "INFO",
  description: "Observed endpoint",
  remediation: "Review endpoint",
  target: "http://127.0.0.1:6001",
  cvss: 0,
  status: "OPEN",
};

describe("Metlo ingest timestamp handling", () => {
  it("uses Metlo lastActiveAt for persisted finding timestamps", () => {
    const dates = getMetloFindingDates({
      ...baseFinding,
      lastActiveAt: "2026-06-10T03:20:00.000Z",
    });

    expect(dates.createdAt?.toISOString()).toBe("2026-06-10T03:20:00.000Z");
    expect(dates.updatedAt?.toISOString()).toBe("2026-06-10T03:20:00.000Z");
  });

  it("accepts epoch seconds from Metlo-like payloads", () => {
    const dates = getMetloFindingDates({
      ...baseFinding,
      lastSeen: 1781061600,
    });

    expect(dates.createdAt?.toISOString()).toBe("2026-06-10T03:20:00.000Z");
  });

  it("ignores invalid timestamps", () => {
    expect(
      getMetloFindingDates({
        ...baseFinding,
        lastActiveAt: "not-a-date",
      }),
    ).toEqual({});
  });
});
