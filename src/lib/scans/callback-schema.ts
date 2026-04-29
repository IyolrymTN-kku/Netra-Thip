import { z } from "zod";

export const ScanCallbackInput = z.object({
  scanJobId: z.string().min(1).max(64),
  status: z.enum(["COMPLETED", "FAILED"]),
  failureReason: z.string().max(2048).optional(),
  rawMongoId: z.string().max(64).optional(),
});

export type ScanCallbackInput = z.infer<typeof ScanCallbackInput>;
