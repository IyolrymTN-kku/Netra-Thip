# Metlo runner notes

Metlo is **passive**: n8n only *reads* discovered endpoints and alerts via the
Metlo REST API. There is no SSH wrapper and the runner must **not** generate
active traffic against the target by default.

## Required changes

1. **Move the `Authorization` token out of the workflow JSON.** The sanitized
   workflow carries the placeholder `REPLACE_WITH_METLO_API_KEY` (used by both
   `Get Metlo Endpoints` and `Get Metlo Alerts`). Put the real, **rotated** key
   in an n8n credential or `$env.METLO_API_KEY`. The previous key
   (`metlo.wNy2…`) is burned — rotate it in Metlo.
2. **Make the backend URL configurable** instead of hardcoded
   `host.docker.internal:8080`: use `METLO_BACKEND_URL`. On Ubuntu set it to a
   real hostname/IP.

## Behaviour

* Read-only: `GET /api/v1/endpoints` and `GET /api/v1/alerts`.
* The target supplied by the operator is the *monitored* API URL; traffic must
  already be flowing through a Metlo agent/proxy (see `metlo-target-demo/`).
* Do not add active probing here — keep Metlo strictly observational.

No approval gate is required for Metlo, but the target URL/host is still
scope-validated by the portal before the n8n branch runs.
