# 06 · Ops Runbook

_Added: 2026-06-15 (D-008). Audience: new agents, new devs, ops._

---

## 1 · Dev environment setup

```bash
# Prerequisites: Bun ≥1.x, Node ≥20 (for tooling)
git clone git@github.com:apexbusiness-systems/playmoney.git
cd playmoney
bun install

# Create local env file (gitignored)
cat > .env <<'EOF'
VITE_SUPABASE_URL=https://xszzsdqqgwciksyjodoy.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key — from Supabase dashboard or CF Worker secrets>
EOF

bun run dev        # local dev server (mock client — no Supabase needed)
bun run typecheck  # must be clean before any PR
bun run test       # 87 tests must pass
bun run lint       # not fully green (formatting debt in route files — P7 scope)
```

If `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are present in `.env`, the app uses the
real Supabase backend. Without them it falls back to `MockApiClient` automatically
(`src/lib/playmoney/client.ts` → `selectClients()`).

---

## 2 · Build & deploy

```bash
bun run build   # vite build → .output/server/index.mjs + .output/public/
bun run deploy  # build + wrangler deploy (uses .output/server/wrangler.json)
```

**Never commit `.output/`** — it's in `.gitignore`. The wrangler config inside it is
generated fresh on every build. Never edit `.output/server/wrangler.json` manually; edit
`vite.config.ts` → `nitro({...})` options instead, then rebuild.

---

## 3 · Cloudflare Workers — account & resources

| Resource | Value |
|---|---|
| Account | `Playmoneywins@gmail.com` |
| Account ID | `53dfe0e79d719c097188b3e0bd89e331` |
| Worker name | `playmoney` |
| Workers.dev URL | `https://playmoney.playmoneywins.workers.dev` |
| Production URL | `https://playmoney.icu` |
| www redirect | `https://www.playmoney.icu` (same worker) |
| CF Zone ID | `fe8e2cfc26fc8486991faa08b37bc58a` |
| Compatibility date | `2025-09-23` |
| Compat flags | `nodejs_compat` |

Authentication for wrangler uses the `CLOUDFLARE_API_TOKEN` env var (Account API Token,
`cfat_...` format). The token is stored in the cloud execution environment.

---

## 4 · Secrets management

### Worker secrets (runtime, not baked into bundle)
```bash
# Set / rotate a secret
echo "new-value" | wrangler secret put SECRET_NAME \
  --config .output/server/wrangler.json

# List current secrets
wrangler secret list --config .output/server/wrangler.json
```

Current Worker secrets:
- `VITE_SUPABASE_URL` — Supabase project URL (also baked at build time)
- `VITE_SUPABASE_ANON_KEY` — RLS-scoped anon key (also baked at build time)

**To-do (SECURITY-001):** add `SUPABASE_SERVICE_ROLE_KEY` as a Worker secret once
server-only functions need it (P4+). Never store it in `.env` committed to git.

### Build-time env (baked into client bundle)
Defined in local `.env` (gitignored). Values are injected by Vite via `import.meta.env.VITE_*`.
These are public config (RLS-protected); not secrets. Must be present at `bun run build` time.

---

## 5 · Database — Supabase

```bash
bun run db:migrate    # apply all migrations in supabase/migrations/ (idempotent)
bun run db:verify-rls # prove anon user is denied on all tables (must be 8/8)
```

Migrations: `0001_foundation` → `0006_recovery_domain`. Applied via Management API SQL
endpoint (`scripts/db/migrate.ts`). Tracked by `private.schema_migrations` table.

Supabase project: `xszzsdqqgwciksyjodoy.supabase.co`
Admin access: `SUPABASE_SERVICE_ROLE_KEY` env var (server-only; never in client bundle).

---

## 6 · Domain & DNS (playmoney.icu)

Domain registrar: **IONOS** — NS delegated to Cloudflare.
Cloudflare nameservers: `julissa.ns.cloudflare.com` / `quinton.ns.cloudflare.com`.

DNS records in the CF zone (managed via CF dashboard or API):
- `AAAA playmoney.icu → 100::` (proxied — routes to Worker via CF custom domain)
- `AAAA www.playmoney.icu → 100::` (proxied — same)
- `TXT _acme-challenge.*` — ACME validation records for SSL certs (3 cert packs).
  These can be cleaned up after cert renewal (~90 days); Cloudflare re-adds them.

To add/remove DNS records:
```bash
# Via CF API
curl -X POST "https://api.cloudflare.com/client/v4/zones/fe8e2cfc26fc8486991faa08b37bc58a/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"A","name":"sub.playmoney.icu","content":"1.2.3.4","proxied":true}'
```

---

## 7 · Go-live gate checklist (NEVER flip without every box checked)

The `PLAYMONEY_MODE` env var in the CF Worker must **never** be set to `LIVE` until:

- [ ] `G-counsel` — Alberta fintech counsel counter-signed (ops attestation only)
- [ ] `G-noncustody` — T1 test green + end-to-end non-custodial flow verified
- [ ] `G-loa` — e-LOA live and gating every execute action (T3)
- [ ] `G-geofence` — AB-only gate enforced in onboarding (T4)
- [ ] `G-avenues` — 4 administrative avenues only; ins/credit/DTC hard-OFF (T5)
- [ ] `G-contract` — ToS + Privacy Policy published; consent captured per CPA (T_contract)
- [ ] `G-pad` — PAD/card consent Rule H1 live (T_pad)
- [ ] `G-causation` — fee causation + DIY-free disclosure live (T2)
- [ ] `G-fraud` — human-review-before-send queue live (T7)
- [ ] `G-insurance` — E&O + cyber insurance bound, no AI exclusion (external, ops only)

To set a gate (ops only — never auto-set in code):
```typescript
// Server-only, requires SUPABASE_SERVICE_ROLE_KEY
import { setGateAttestation } from "@/lib/compliance/gates.server";
await setGateAttestation("G-noncustody", true, "reviewed by <name> on <date>");
```

To enable LIVE mode **after all gates green**:
```bash
# Add PLAYMONEY_MODE=LIVE to the CF Worker env vars
wrangler secret put PLAYMONEY_MODE --config .output/server/wrangler.json
# Enter: LIVE
# Then verify: canGoLive() must return true
```

---

## 8 · Agent onboarding (new Claude Code session)

Every new agent session must, before writing any code:

1. Read `omni-recall/` in order (README → 00 → 01 → 02 → 03 → 04 → 05 → 06).
2. Run `bun run typecheck && bun run test` — baseline must be clean.
3. State the current phase from `03-decision-log.md` NEXT section.
4. Confirm `PLAYMONEY_MODE` is not set to `LIVE` in any env or Worker config.
5. Never skip the hallucination firewall (`02-invariants-and-lanes.md`): open files before
   claiming they exist; cite paths; mark unverified facts with `[UNVERIFIED: reason]`.

Append to `03-decision-log.md` for every decision, YELLOW assumption, or STOP encountered.

---

## 9 · Incident response

**Worker returns 5xx:**
1. Check `wrangler tail playmoney` for live logs.
2. Check `https://playmoney.playmoneywins.workers.dev` — if workers.dev is OK but
   playmoney.icu is not, issue is CF zone/DNS/cert, not the worker code.
3. Roll back: `wrangler deployments list --name playmoney` → pick a prior version ID →
   `wrangler rollback <version-id> --name playmoney`.

**SSL cert expired / 503 on HTTPS:**
1. Check cert packs: `GET /zones/<zone-id>/ssl/certificate_packs?status=all`
2. If `pending_validation`: add missing ACME TXT records to DNS (see §6 above).
3. Cloudflare auto-renews Universal SSL; Advanced certs may need manual ACME re-validation.

**Supabase outage:**
- App falls back to `MockApiClient` automatically only if `VITE_*` keys are absent at
  build time. In production (keys baked in), a Supabase outage surfaces as API errors.
- No automatic fallback in production by design — the mock must not silently serve stale data.

**Accidental `PLAYMONEY_MODE=LIVE` set:**
1. Immediately: `wrangler secret delete PLAYMONEY_MODE --name playmoney`
2. Trigger a new deploy to flush the Worker.
3. Verify `isLiveEnabled()` returns false in the next request.
4. Log the incident in `03-decision-log.md`.
