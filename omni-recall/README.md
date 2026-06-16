# omni-recall

Durable cross-session memory for the PlayMoney compliance-as-architecture build
(APEX Business Systems Ltd., Edmonton, AB). Agents have **no memory of prior
sessions** — reconstruct state from this folder + the repo. **The repo is the
single source of truth; the Rev.3 legal spec is the target.**

## Read order (every session, before any code)

1. `00-recon-report.md` — verified state of the repo as of last recon.
2. `01-compliance-map.md` — the 17-row Rev.3 control map (the target).
3. `02-invariants-and-lanes.md` — non-negotiable invariants + GREEN/YELLOW/RED lanes.
4. `03-decision-log.md` — decisions, YELLOW assumptions, and open STOPs. Append-only.
5. `04-go-live-gate.md` — the BUILT→LIVE gate spec. App default = BUILT.

## The one bright line (highest invariant)

- **BUILT** = write/wire/test all code, schemas, contracts. Always allowed.
- **LIVE** = real users, real recoveries, real fees. **Physically gated.**
- Default mode = `BUILT`. No code path, flag, seed, or test may set `LIVE`.
- Go-live requires external Alberta fintech counsel counter-sign + all gates green.

## How to update this folder

- Append to `03-decision-log.md` whenever a decision/assumption/STOP is made.
- Update `00-recon-report.md` only after re-running recon against the repo.
- Never record secrets, tokens, credentials, or PII here.
- Never claim a file/table/test exists without citing a path you opened/ran.

_Last updated: 2026-06-15 (D-009: Lovable purged; Cloudflare+GitHub+Supabase canonical)._
