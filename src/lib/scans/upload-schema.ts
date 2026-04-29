import { z } from "zod";

export const FileRefSchema = z.object({
  path: z.string().min(1).max(2048),
  originalName: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
});

export type FileRef = z.infer<typeof FileRefSchema>;
