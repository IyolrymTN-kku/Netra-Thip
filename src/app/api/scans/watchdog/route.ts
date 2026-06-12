import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { JobStatus, Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit/audit";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Auth check if needed, but this is an internal watchdog. 
    // You might want to secure this with a secret token in production.

    // Find jobs that have been RUNNING for more than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const stuckJobs = await prisma.scanJob.findMany({
      where: {
        status: JobStatus.RUNNING,
        updatedAt: { lt: twoHoursAgo }
      },
      include: { project: true }
    });

    if (stuckJobs.length === 0) {
      return NextResponse.json({ ok: true, message: "No stuck jobs found" });
    }

    let failedCount = 0;

    for (const job of stuckJobs) {
      const merged: Record<string, unknown> = {
        ...((job.parameters as Record<string, unknown> | null) ?? {}),
        _failureReason: "Job timed out (watchdog cleanup)"
      };

      await prisma.scanJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          completedAt: new Date(),
          parameters: merged as Prisma.InputJsonObject
        }
      });

      // Create Notification
      if (job.project?.userId) {
        await prisma.notification.create({
          data: {
            userId: job.project.userId,
            title: "Scan Job Timed Out",
            message: `Scan job ${job.toolName} (Target: ${job.project.name}) has been running for too long and was marked as failed.`,
            type: "warning",
            link: "/scans",
          }
        });
      }

      // Log Audit
      void logAudit({
        action: "SCAN_COMPLETED",
        targetType: "ScanJob",
        targetId: job.id,
        metadata: { status: "FAILED", failureReason: "Job timed out" },
        ipAddress: "watchdog",
      });

      failedCount++;
    }

    return NextResponse.json({ ok: true, failedCount });
  } catch (err) {
    console.error("[watchdog] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
