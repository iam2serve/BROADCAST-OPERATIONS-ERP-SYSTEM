# Environment Setup

## Security

- Secrets must be supplied by the deployment platform, not committed.
- `AUTH_COOKIE_SECURE=true` in production.
- `TRUST_PROXY=true` when running behind a reverse proxy.
- `CORS_ORIGINS` and `CSRF_TRUSTED_ORIGINS` must list exact trusted origins.

## Observability

- Logs are structured JSON.
- Every request has `x-request-id`.
- `/api/v1/health/metrics` exposes in-process counters for API, queue, sync, worker, and error metrics.

## Rate Limits

- `RATE_LIMIT_MAX` controls general API requests.
- `AUTH_RATE_LIMIT_MAX` is reserved for stricter auth route throttling.
