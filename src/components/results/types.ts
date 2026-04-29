import type { Finding } from "@prisma/client";

// Finding row enriched with the toolName from the parent ScanJob — denormalised
// at fetch time so the table can render the tool column without an N+1.
export type FindingRow = Finding & {
  scanJob: { toolName: string };
};
