import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-netra-signature";

function loadSecret(): string {
  const s = process.env.N8N_CALLBACK_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "N8N_CALLBACK_SECRET missing or too short (>=32 chars). Generate with: openssl rand -hex 32",
    );
  }
  return s;
}

export function signScanJob(scanJobId: string): string {
  return createHmac("sha256", loadSecret()).update(scanJobId).digest("hex");
}

export function verifySignature(
  scanJobId: string,
  presented: string | null | undefined,
): boolean {
  if (!presented) return false;
  let expected: string;
  try {
    expected = signScanJob(scanJobId);
  } catch {
    return false;
  }
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(presented, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}
