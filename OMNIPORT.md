# OmniPort — APEX-OmniHub Connector

OmniPort is a **sidecar** that lets the APEX-OmniHub control plane authenticate, dispatch
hot-edit commands, and observe PlayMoney's live state **without modifying app source per
update** — and **without any effect on PlayMoney when it is disabled**.

It is **off by default**. PlayMoney builds, tests, and runs identically whether or not
OmniPort is enabled. When disabled, every `/api/omniport/*` endpoint returns `503`.

## What it is NOT

OmniPort is firewalled away from the PlayMoney compliance spine:

- It **never** imports or calls `assertLiveAllowed()` and does not import from `compliance/*`.
- It touches **zero** money types — no `Cents`, no `UserPayoutRef`, no fund-holding surface.
- It cannot move money, change recovery state, or flip the BUILT/LIVE go-live seal. Its
  feature-flag table is a standalone store; nothing in the compliance spine reads it.
- Its two tables are **service-role only** (RLS enabled, no policies → anon/authenticated
  are denied by default).

## Enabling it

OmniPort reads two secrets from the environment (per-request, inside the handler):

| Var                | Purpose                                                        |
| ------------------ | ------------------------------------------------------------- |
| `OMNIPORT_ENABLED` | Must be exactly `"true"` to bring the connector online.       |
| `OMNIPORT_SECRET`  | Long random hex; the HMAC key shared with the OmniHub dashboard. |

Production (Cloudflare Workers):

```bash
wrangler secret put OMNIPORT_ENABLED   # enter: true
wrangler secret put OMNIPORT_SECRET    # enter: <long random hex from the OmniHub dashboard>
```

Apply the migration that creates the connector tables:

```bash
bun run db:migrate   # applies supabase/migrations/0010_omniport.sql (idempotent)
```

## How OmniHub connects

Every inbound packet is authenticated by an HMAC-SHA256 signature over the **raw request
body**, sent in a header:

```
X-OmniPort-Signature: sha256=<hex>
<hex> = HMAC-SHA256(key = OMNIPORT_SECRET, message = rawRequestBodyAsUtf8)
```

Verification uses the Web Crypto API (`crypto.subtle`), native to the Workers runtime. The
comparison is constant-time. A missing/malformed/mismatched signature returns `401` (never
`500`). The raw body and signature are never logged.

### Endpoints

| Method · Path               | Auth                 | Purpose                                            |
| --------------------------- | -------------------- | -------------------------------------------------- |
| `GET  /api/omniport/health` | enabled-guard only   | Liveness + read-only `OmniSnapshot`.               |
| `POST /api/omniport/sync`   | enabled + signature  | Authenticated state pull (returns `OmniSnapshot`). |
| `POST /api/omniport/command`| enabled + signature  | Dispatch one hot-edit command (returns `OmniReceipt`). |

### Command packet (`POST /api/omniport/command`)

```jsonc
{
  "command": "SET_FEATURE_FLAG",      // | BROADCAST_NOTICE | REFRESH_CONFIG | HEALTH_PING
  "payload": { "key": "beta", "value": "on" },
  "sentAt": "2026-06-22T00:00:00Z",
  "nonce": "unique-per-packet"
}
```

| Command            | Effect                                              | Receipt (DB-derived)            |
| ------------------ | --------------------------------------------------- | ------------------------------- |
| `SET_FEATURE_FLAG` | Upsert `omniport_feature_flags(key, value)`         | DB `updated_at` timestamp       |
| `BROADCAST_NOTICE` | Insert `omniport_command_log` (payload serialized)  | DB-generated row `id`           |
| `REFRESH_CONFIG`   | Insert `omniport_command_log`                       | DB-generated row `id`           |
| `HEALTH_PING`      | No write; returns the current `OmniSnapshot`        | snapshot `checkedAt`            |

Every receipt is read back from the database **after** the write resolves — a receipt is
never fabricated before the mutation is confirmed. If the write fails, no `success: true`
receipt is returned.

### Responses

| Status | When                                                          |
| ------ | ------------------------------------------------------------ |
| `200`  | Command executed / snapshot returned.                        |
| `400`  | Malformed JSON, invalid packet schema, or invalid payload (structured Zod error). |
| `401`  | Missing / malformed / mismatched signature.                  |
| `503`  | `OMNIPORT_ENABLED` is not `"true"` (connector offline).      |

## Rate limiting

Every response carries `X-RateLimit-Limit: 60`. Actual enforcement is at the Cloudflare
edge — the operator must add a Cloudflare rate-limiting rule for `/api/omniport/*` (e.g.
60 requests/min per source). OmniPort does not implement in-process rate limiting.

## Implementation notes

- **Request access.** The handlers are `createServerFn` server functions (same pattern as
  `health.functions.ts`), so their server-only bodies are stripped from the client bundle.
  Each reads the active `Request` via `getRequest()` from `@tanstack/react-start/server`
  (dynamically imported inside the handler — the loader context does not expose `request`,
  and a static/route-level import of `react-start/server` is rejected by the framework's
  import-protection plugin). The server fn returns `{ status, payload }` (pre-serialized
  JSON); the route loader emits it as the `Response`.
- **Routes** are auto-discovered by the `@tanstack/router-plugin` on `bun run build` /
  `vite dev`, which regenerates `src/routeTree.gen.ts`. No manual registration is needed;
  re-run a build after adding/removing OmniPort routes.
- **Pure core.** `types.ts` (Zod), `auth.ts` (HMAC), `commands.ts` (dispatch over an
  injected `OmniDb`), and `snapshot.ts` (snapshot builder) are pure and fully unit-tested in
  `src/lib/omniport/omniport.test.ts`. The only I/O lives in `omniport.functions.ts`.
