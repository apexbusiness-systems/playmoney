// Reproducible RLS proof (T9). Confirms protected tables are unreachable with
// the anon key while the service role (bypass) sees rows. Exits non-zero on any
// failure. Run with: bun run db:verify-rls
//
// Uses env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import process from "node:process";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function rows(table: string, key: string): Promise<number> {
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    // A 401/403 is also a valid "denied" outcome.
    if (res.status === 401 || res.status === 403) return 0;
    throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as unknown[];
  return Array.isArray(body) ? body.length : 0;
}

// Tables that must be invisible to an unauthenticated anon caller.
const PROTECTED = [
  "profiles",
  "go_live_attestations",
  "loa_tokens",
  "user_acceptances",
  "pad_consents",
  "fee_charges",
  "review_queue",
  "audit_log",
  "recoveries",
  "recovery_events",
  "approvals",
  "notifications",
];

let failures = 0;
for (const t of PROTECTED) {
  const anonRows = await rows(t, anon);
  if (anonRows !== 0) {
    console.error(`❌ ${t}: anon saw ${anonRows} rows (RLS LEAK)`);
    failures++;
  } else {
    console.log(`✅ ${t}: anon denied (0 rows)`);
  }
}

// Sanity: service role bypasses RLS and can see the seeded gate rows.
const gateRows = await rows("go_live_attestations", service);
if (gateRows < 10) {
  console.error(`❌ go_live_attestations: service role saw ${gateRows} rows (expected >= 10)`);
  failures++;
} else {
  console.log(`✅ go_live_attestations: service role sees ${gateRows} rows (bypass works)`);
}

if (failures > 0) {
  console.error(`\nRLS verification FAILED with ${failures} issue(s).`);
  process.exit(1);
}
console.log("\nRLS verification passed: every protected table denies anon access.");
