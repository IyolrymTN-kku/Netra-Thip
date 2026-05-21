## Summary
Explain what changed.

## Why
Explain why the change is needed.

## Changes
List the key implementation changes.

## Security Considerations
- Auth/RBAC impact:
- Ownership checks:
- Secret handling:
- Webhook HMAC impact:
- CORS/proxy risk:
- Path traversal risk:

## Test Evidence
Include commands run and important manual test cases.

## Screenshots / Recordings
(Required if UI changed)

## Rollback Plan
Explain how to safely revert.

## Checklist
- [ ] I reviewed existing architecture
- [ ] I kept the diff small and reviewable
- [ ] I preserved authentication behavior
- [ ] I preserved or added RBAC checks
- [ ] I validated Prisma ownership boundaries
- [ ] I did not expose secrets to the client
- [ ] I validated API input
- [ ] I handled errors safely
- [ ] I added or updated tests where needed
- [ ] I ran lint/typecheck/test/build where available
- [ ] I used a Conventional Commit style title
