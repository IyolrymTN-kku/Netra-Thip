import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { AuditAction } from "@prisma/client";

interface AuditEntry {
  action: AuditAction;
  userId?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Fire-and-forget audit logger.
 * Writes a single row to the AuditLog table.
 * Failures are silently caught to avoid breaking the primary operation.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}

/**
 * Extract client IP from request headers.
 * Works behind reverse proxies (Nginx, Cloudflare, etc.)
 * Returns "unknown" in dev / when no proxy headers are present.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
