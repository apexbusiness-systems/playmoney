// Migration runner — applies supabase/migrations/*.sql to the live project via
// the Supabase Management API SQL endpoint (no Supabase CLI required here).
// Idempotent: tracks applied versions in private.schema_migrations and skips
// them. Run with: bun run db:migrate
//
// Requires env: SUPABASE_TOKEN (management token) + SUPABASE_URL (for project
// ref). Secrets come from the environment only — never the repo.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../supabase/migrations");

function projectRef(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL");
  const m = /https?:\/\/([a-z0-9]+)\.supabase\./i.exec(url);
  if (!m) throw new Error("Cannot parse project ref from SUPABASE_URL");
  return m[1];
}

async function runSql(query: string): Promise<unknown> {
  const token = process.env.SUPABASE_TOKEN;
  if (!token) throw new Error("Missing SUPABASE_TOKEN");
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef()}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    },
  );
  if (!res.ok) {
    throw new Error(`SQL failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function appliedVersions(): Promise<Set<string>> {
  await runSql(
    `create schema if not exists private;
     create table if not exists private.schema_migrations (
       version text primary key, applied_at timestamptz not null default now());`,
  );
  const rows = (await runSql(
    `select version from private.schema_migrations order by version;`,
  )) as Array<{ version: string }>;
  return new Set(rows.map((r) => r.version));
}

async function main() {
  const done = await appliedVersions();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let applied = 0;
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (done.has(version)) {
      console.log(`✓ skip   ${version} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`→ apply  ${version}`);
    await runSql(sql);
    await runSql(
      `insert into private.schema_migrations (version) values ('${version}')
       on conflict (version) do nothing;`,
    );
    applied++;
    console.log(`✓ done   ${version}`);
  }
  console.log(`\nMigrations complete. Applied ${applied}, skipped ${files.length - applied}.`);
}

main().catch((e) => {
  console.error("❌ migrate failed:", e.message);
  process.exit(1);
});
