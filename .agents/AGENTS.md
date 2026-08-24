# PlayMoney — Antigravity Agent Rules & Non-Negotiables

**Repo:** `apexbusiness-systems/playmoney`  
**Stack:** TanStack Start (SSR) + Vite + TanStack Router/Query + Tailwind v4 + Supabase + Cloudflare Workers (Nitro)  
**Package Manager:** `bun` (use `bun`, not `npm` or `pnpm`)

---

## 1. NON-NEGOTIABLES (Guardrails)

1. **No new dependencies, vendors, or recurring cost** without separate, explicit user approval.
2. **Surgical diffs only.** Contain blast radius. No unrelated refactors outside each task's stated file list.
3. **Do not author legal document body text.** Creating route shells and wiring consent hashes is in scope; drafting enforceable policy language requires qualified legal counsel. Use explicit placeholder notices until replaced.
4. **Never ship a mock-data surface presented as live without disclosure.** Follow the established `sampleMode` honesty standard.
5. **Every visible interactive element must be working, locally handled, or disabled with honest copy.** No dead `href="#"` placeholders.
6. **Zero new typecheck errors, ESLint clean, and CI must pass.** Run `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.
7. **Protected paths (DO NOT TOUCH):**
   - `src/lib/compliance/mode.ts` & the BUILT/LIVE invariant guard
   - `src/lib/adapters/*` (Flinks / Plaid integration)
   - `src/lib/engine/*` (Recovery / Fee logic)
   - Supabase RLS policies and migrations
8. **Evidence-first reporting:** Report machine-verifiable proof (logs, test outputs, screenshots). Never claim visual QA that was not performed.
