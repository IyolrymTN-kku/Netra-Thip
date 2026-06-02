# Netra-Thip Security Rules

## Authentication & RBAC
- **NextAuth Protection:** Most frontend pages and API routes are protected by NextAuth middleware. Do not remove or weaken middleware protection.
- **RBAC (Role-Based Access Control):** Mutating or privileged API routes must enforce roles (e.g., `requireRole([ADMIN, PENTESTER])`). VIEWERs must not be allowed to mutate findings, scans, projects, reports, or webhook data.

## Database & Data Ownership
- **Prisma Ownership Validation:** User-owned data must always be queried with ownership validation. Never trust client-provided `userId`. Always validate ownership securely:
  ```typescript
  await prisma.finding.findFirst({
    where: { id: findingId, project: { userId: session.user.id } }
  });
  ```
- Return 404 Not Found (not 403) for foreign resource access attempts to prevent resource enumeration.
- Keep secrets server-side only.

## Webhook Security
- **HMAC Contract (Strict):**
  - Algorithm: `HMAC-SHA256`
  - Key: `N8N_CALLBACK_SECRET` (at least 32 chars)
  - Message: raw `scanJobId` from URL path only
  - Header: `X-Netra-Signature`
  - Encoding: lowercase hex
- Missing or invalid signature must return 401 Unauthorized. Use timing-safe comparison. Do not log secrets or full HMAC signatures.

## Secure KKU CORS Proxy Design
- Use server-side fetch only in Next.js API routes (`/api/kku-*`).
- Do not expose API keys to the browser.
- Validate all query parameters and allowlist upstream API hosts.
- Add timeout handling and normalize upstream errors.

## Secure AutoPentestX PDF Report Export
- User must be authenticated and validated for scan/report ownership.
- Do not accept raw filesystem paths from the client. Resolve report path server-side using scan/report metadata.
- Prevent path traversal and only serve files from the approved reports directory.
- Return `Content-Type: application/pdf` and use safe `Content-Disposition` filenames.
