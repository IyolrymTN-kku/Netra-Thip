import { z } from "zod";
import { Severity } from "@prisma/client";

const CveInput = z.object({
  cveId: z.string().optional(),
  cve_id: z.string().optional(),
  cve: z.string().optional(),
  cvss: z.unknown().optional(),
  score: z.unknown().optional(),
  severity: z.string().optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  remediation: z.string().optional(),
  mitigation: z.string().optional(),
  cvssVector: z.string().optional(),
  cvss_vector: z.string().optional(),
  vector: z.string().optional(),
  attackVector: z.string().optional(),
  attack_vector: z.string().optional(),
  attackComplexity: z.string().optional(),
  attack_complexity: z.string().optional(),
  privilegesRequired: z.string().optional(),
  privileges_required: z.string().optional(),
  userInteraction: z.string().optional(),
  user_interaction: z.string().optional(),
  scope: z.string().optional(),
  confidentiality: z.string().optional(),
  confidentialityImpact: z.string().optional(),
  confidentiality_impact: z.string().optional(),
  integrity: z.string().optional(),
  integrityImpact: z.string().optional(),
  integrity_impact: z.string().optional(),
  availability: z.string().optional(),
  availabilityImpact: z.string().optional(),
  availability_impact: z.string().optional(),
  severitySource: z.string().optional(),
  severity_source: z.string().optional(),
  nativeSeverity: z.string().optional(),
  native_severity: z.string().optional(),
  nativeScore: z.unknown().optional(),
  native_score: z.unknown().optional(),
  affectedPackages: z.union([z.array(z.unknown()), z.string()]).optional(),
  affected_packages: z.union([z.array(z.unknown()), z.string()]).optional(),
  primarySource: z.string().optional(),
  primary_source: z.string().optional(),
  primarySrc: z.string().optional(),
  primary_src: z.string().optional(),
  references: z.union([z.array(z.unknown()), z.string()]).optional(),
}).passthrough();

export const FindingInput = z.object({
  title: z.string().min(1).max(500),
  severity: z.nativeEnum(Severity),
  description: z.string().max(20_000),
  remediation: z.string().max(20_000),
  target: z.string().min(1, "Target is required"),
  cvss: z.number().min(0).max(10).nullish(),
  cves: z.array(CveInput).nullish(),
  status: z.enum(["OPEN", "RESOLVED", "IGNORED"]).default("OPEN"),
}).passthrough();

export const ResultsIngestInput = z.object({
  findings: z.array(FindingInput).min(0).max(5_000),
});

export type FindingInput = z.infer<typeof FindingInput>;
export type ResultsIngestInput = z.infer<typeof ResultsIngestInput>;
