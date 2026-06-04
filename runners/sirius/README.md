# Sirius runner notes

Sirius is **not** invoked over SSH — n8n talks to it via its REST API and a
RabbitMQ publish. There is no `run-safe.sh`; the hardening for Sirius is about
**secrets and endpoint configuration** in n8n (Phase 3 documents it; the n8n
workflow edit itself is a manual step — see
[`../../orchestration/n8n/README.md`](../../orchestration/n8n/README.md)).

## Required changes

1. **Move `X-API-Key` out of the workflow JSON.** The sanitized workflow already
   carries the placeholder `REPLACE_WITH_SIRIUS_API_KEY`. Put the real, **rotated**
   key in an n8n credential or `$env.SIRIUS_API_KEY`. The previous key
   (`f48ace3d…`) is burned — rotate it on the Sirius host.
2. **Make endpoints configurable** instead of hardcoded `host.docker.internal`:
   * `SIRIUS_BASE_URL` (default was `http://host.docker.internal:9898`)
   * RabbitMQ management URL (default was `http://host.docker.internal:15673`)
   On Ubuntu/Docker Engine, set these to real hostnames/IPs or add
   `extra_hosts: host.docker.internal:host-gateway`.

## Scope

Sirius receives the **raw** target (single IP / CIDR / range / domain). The
portal already scope-validates it before dispatch, so Sirius scans stay within
the allowlist. Keep Sirius on safe profiles (`quick` / VA) for unattended runs;
treat aggressive/agent profiles as approval-worthy in your operating procedure.

## Ports

Expose only the Sirius UI/API port you actually need; keep the RabbitMQ
management port internal to the runner/compose network (never public).
