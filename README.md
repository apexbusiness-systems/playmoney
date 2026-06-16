# PlayMoney

End-to-End Implementation of the PlayMoney App.

## Ops Status

PlayMoney runs on a strict 7-phase go-live process. Before production deployment, ops personnel must verify the deployment gates against the health check endpoint and the Go-Live Checklist.

- **Checklist:** `docs/ops/go-live-checklist.md`
- **Health Check Endpoint:** `/api/health`

**Invariant Mode**: This application is hardcoded to default to `BUILT` mode to strictly ensure no production operations are executed by default. `LIVE` mode cannot be seeded into the runtime except dynamically under strictly controlled tests.
