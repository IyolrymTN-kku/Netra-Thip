import "server-only";
import path from "node:path";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ALLOWED_UPLOAD_EXTENSIONS = new Set([".json"]);
export const ALLOWED_UPLOAD_MIME = new Set([
  "application/json",
  "text/json",
  "text/plain",
  "application/octet-stream",
]);

const SAFE_NAME_RE = /[^a-zA-Z0-9._-]+/g;

export function sanitiseFilename(input: string): string {
  const base = path.basename(input);
  const cleaned = base.replace(SAFE_NAME_RE, "_").replace(/^\.+/, "_");
  return cleaned.slice(0, 80) || "upload.bin";
}

export function userUploadDir(userId: string): string {
  return path.join(UPLOAD_DIR, userId);
}

// Reject any path that doesn't resolve under the calling user's upload directory.
// Defends against `../../etc/passwd`-style traversal in client-supplied refs.
export function assertPathInUserDir(
  candidate: string,
  userId: string,
): string {
  const resolved = path.resolve(candidate);
  const userDir = userUploadDir(userId);
  const rel = path.relative(userDir, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("upload path escapes user directory");
  }
  return resolved;
}
