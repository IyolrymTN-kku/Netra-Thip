import { z } from "zod";
import { FindingStatus } from "@prisma/client";

export const UpdateFindingInput = z.object({
  status: z.nativeEnum(FindingStatus),
});

export type UpdateFindingInput = z.infer<typeof UpdateFindingInput>;
