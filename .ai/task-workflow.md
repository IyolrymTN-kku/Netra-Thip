# AI Agent Task Workflow

Follow the 6-Step Development Pipeline:

1. **Ask (Task Intake):** Analyze the request, identify security-sensitive areas, state the goal and approach. Wait for clarification if the request contradicts security rules.
2. **Plan (Repository Recon):** Read relevant files, identify existing patterns (especially security checks). Do not invent new patterns if safe ones exist. Keep the plan short.
3. **Implement:** Keep diffs small, keep API route handlers thin, validate input, keep secrets server-side, handle errors safely.
4. **Review Diff (Testing and Verification):** Run checks (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`). Verify auth, RBAC, webhook HMAC, and proxy security.
5. **Run/Test:** Output the summary, files changed, security considerations, and verifications performed.
6. **Commit:** Generate Conventional Commits and prepare Pull Request descriptions using standard templates.
