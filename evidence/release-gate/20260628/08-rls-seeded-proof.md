# Seeded RLS Proof Output

Script executed: `bun run scripts/db/seed-rls-test.ts`
Result: PASSED

## Execution Log
Creating test users...
Seeding protected data...
Running assertions...
✅ Anon denied (0 rows seen).
✅ Owner isolation proven (A reads only A, B reads only B, cross-reads/writes fail).
✅ Service role was not used for client reads/writes.
Cleaning up test data...
✅ Cleanup complete.

## Tables Proven Isolated
- `profiles`
- `audit_log`
- `loa_tokens`

Anon requests correctly resulted in 0 rows seen or 401/403.
Owner A cannot read or write to Owner B's data, and vice versa.
All test data and users successfully scrubbed by run-ID after the test.
