"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { JobStatus } from "@prisma/client";

const POLL_MS = 8000;
const TERMINAL: ReadonlySet<JobStatus> = new Set(["COMPLETED", "FAILED"]);

interface ScanStatusPollerProps {
  scanJobId: string;
  initialStatus: JobStatus;
}

export function ScanStatusPoller({
  scanJobId,
  initialStatus,
}: ScanStatusPollerProps) {
  const router = useRouter();
  const lastSeen = useRef<JobStatus>(initialStatus);

  useEffect(() => {
    if (TERMINAL.has(initialStatus)) return;
    let cancelled = false;

    async function tick() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      try {
        const res = await fetch(`/api/scans/${scanJobId}/status`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { status: JobStatus };
        if (data.status !== lastSeen.current) {
          lastSeen.current = data.status;
          router.refresh();
        }
        if (TERMINAL.has(data.status)) {
          clearInterval(handle);
        }
      } catch {
        // swallow — next tick will retry
      }
    }

    const handle = setInterval(tick, POLL_MS);
    void tick();

    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [scanJobId, initialStatus, router]);

  return null;
}
