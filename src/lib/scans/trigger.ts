import "server-only";
import { Prisma, AssetType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { signScanJob, SIGNATURE_HEADER } from "./signing";

const TRIGGER_TIMEOUT_MS = 10_000;

interface FileRef {
  path: string;
  originalName: string;
  size: number;
}

export interface TriggerArgs {
  scanJob: { id: string; projectId: string; toolName: string };
  target: string;
  assetType: AssetType;
  parameters: Record<string, unknown>;
  secrets: Record<string, string>;
  fileRefs: Record<string, FileRef>;
  callbackUrl: string;
}

async function markFailed(scanJobId: string, reason: string): Promise<void> {
  try {
    const job = await prisma.scanJob.findUnique({
      where: { id: scanJobId },
      select: { parameters: true },
    });
    const merged: Record<string, unknown> = {
      ...((job?.parameters as Record<string, unknown> | null) ?? {}),
      _triggerError: reason,
    };
    await prisma.scanJob.update({
      where: { id: scanJobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        parameters: merged as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    console.error("[trigger] failed to mark job FAILED:", e);
  }
}

async function markRunning(scanJobId: string): Promise<void> {
  try {
    await prisma.scanJob.update({
      where: { id: scanJobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  } catch (e) {
    console.error("[trigger] failed to mark job RUNNING:", e);
  }
}

// Fire-and-forget. Caller does `void triggerScanAsync(...)` and returns 201
// immediately. State transitions PENDING -> RUNNING (on 2xx) or PENDING -> FAILED
// (on timeout / non-2xx) happen out of band.
export async function triggerScanAsync(args: TriggerArgs): Promise<void> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    await markFailed(
      args.scanJob.id,
      "N8N_WEBHOOK_URL not configured",
    );
    return;
  }

  const signature = signScanJob(args.scanJob.id);
  const payload = {
    scanJobId: args.scanJob.id,
    projectId: args.scanJob.projectId,
    toolName: args.scanJob.toolName,
    target: args.target,
    assetType: args.assetType,
    parameters: args.parameters,
    secrets: args.secrets,
    fileRefs: args.fileRefs,
    callbackUrl: args.callbackUrl,
    signature,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SIGNATURE_HEADER]: signature,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TRIGGER_TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      await markFailed(
        args.scanJob.id,
        `n8n responded ${res.status}: ${text.slice(0, 200)}`,
      );
      return;
    }
    await markRunning(args.scanJob.id);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown trigger error";
    await markFailed(args.scanJob.id, reason);
  }
}
