import { z } from "zod";
import { FindingStatus, Severity } from "@prisma/client";

export const FindingInput = z.object({
  title: z.string().min(1).max(500),
  severity: z.nativeEnum(Severity),
  description: z.string().max(20_000),
  remediation: z.string().max(20_000),
  target: z.string().min(1, "Target is required"),
  cvss: z.number().min(0).max(10).nullish(),
  cves: z.array(
    z.object({
      cveId: z.string(),
      cvss: z.number().nullish(),
      severity: z.string(),
      description: z.string()
    })
  ).nullish(),
  status: z.enum(["OPEN", "RESOLVED", "IGNORED"]).default("OPEN"),
});

export const ResultsIngestInput = z.object({
  findings: z.array(FindingInput).min(0).max(5_000),
});

export type FindingInput = z.infer<typeof FindingInput>;
export type ResultsIngestInput = z.infer<typeof ResultsIngestInput>;
