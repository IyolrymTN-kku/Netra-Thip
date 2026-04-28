import { z } from "zod";
import { AssetType } from "@prisma/client";
import { TOOLS } from "@/lib/tools/registry";

const TOOL_IDS = TOOLS.map((t) => t.id) as [string, ...string[]];

export const CreateScanInput = z.object({
  toolName: z.enum(TOOL_IDS),
  projectId: z.string().min(1, "projectId is required"),
  target: z.string().min(1).max(2048),
  assetType: z.nativeEnum(AssetType),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export type CreateScanInput = z.infer<typeof CreateScanInput>;
