import { z } from "zod";
import { FindingStatus, Severity } from "@prisma/client";

export const FindingInput = z.object({
  title: z.string().min(1).max(500),
  severity: z.nativeEnum(Severity),
  description: z.string().max(20_000),
  remediation: z.string().max(20_000),
  target: z.string().min(1).max(2048),
  cvss: z.number().min(0).max(10).optional(),
  status: z.nativeEnum(FindingStatus).optional(),
});

export const ResultsIngestInput = z.object({
  findings: z.array(FindingInput).min(0).max(5_000),
});

export type FindingInput = z.infer<typeof FindingInput>;
export type ResultsIngestInput = z.infer<typeof ResultsIngestInput>;
