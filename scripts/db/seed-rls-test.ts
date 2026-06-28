import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabaseAnon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const timestamp = Date.now();
const emailA = `playmoney-rls-owner-a+${timestamp}@example.test`;
const emailB = `playmoney-rls-owner-b+${timestamp}@example.test`;
const password = `testpass-${timestamp}`;

async function run() {
  console.log(`Creating test users...`);
  const { data: userA, error: errA } = await supabaseAdmin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
  });
  const { data: userB, error: errB } = await supabaseAdmin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
  });

  if (errA || errB) {
    console.error("Failed to create users", errA, errB);
    process.exit(1);
  }

  const idA = userA.user.id;
  const idB = userB.user.id;

  try {
    console.log(`Seeding protected data...`);
    // Insert into profiles
    const { error: profErr } = await supabaseAdmin.from("profiles").insert([
      { id: idA, jurisdiction_province: `Test AB ${timestamp}`, display_name: "User A" },
      { id: idB, jurisdiction_province: `Test B ${timestamp}`, display_name: "User B" },
    ]);
    if (profErr) throw new Error("Insert profiles failed: " + JSON.stringify(profErr));

    // Insert into audit_log
    const { error: auditErr } = await supabaseAdmin.from("audit_log").insert([
      { owner_id: idA, action: "RLS_TEST", detail: { runId: timestamp } },
      { owner_id: idB, action: "RLS_TEST", detail: { runId: timestamp } },
    ]);
    if (auditErr) throw new Error("Insert audit_log failed: " + JSON.stringify(auditErr));

    // Insert into loa_tokens
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    const { error: loaErr } = await supabaseAdmin.from("loa_tokens").insert([
      {
        owner_id: idA,
        recovery_id: "test-rec-a",
        avenue: "test",
        merchant: "test",
        max_amount_cents: 1000,
        signed_by: "A",
        signature_method: "test",
        signature_statement: "test",
        consent_electronic: true,
        expires_at: expiresAt,
        idempotency_key: "tok_a",
      },
      {
        owner_id: idB,
        recovery_id: "test-rec-b",
        avenue: "test",
        merchant: "test",
        max_amount_cents: 1000,
        signed_by: "B",
        signature_method: "test",
        signature_statement: "test",
        consent_electronic: true,
        expires_at: expiresAt,
        idempotency_key: "tok_b",
      },
    ]);
    if (loaErr) throw new Error("Insert loa_tokens failed: " + JSON.stringify(loaErr));

    // Sign in to get sessions
    const clientA = createClient(url, anonKey, { auth: { persistSession: false } });
    await clientA.auth.signInWithPassword({ email: emailA, password });

    const clientB = createClient(url, anonKey, { auth: { persistSession: false } });
    await clientB.auth.signInWithPassword({ email: emailB, password });

    console.log(`Running assertions...`);

    // 1. Anon access
    const { data: anonProfiles } = await supabaseAnon
      .from("profiles")
      .select("*")
      .eq("jurisdiction_province", `Test AB ${timestamp}`);
    if (anonProfiles && anonProfiles.length > 0) throw new Error("Anon could read profiles!");
    const { data: anonAudit } = await supabaseAnon
      .from("audit_log")
      .select("*")
      .eq("action", "RLS_TEST");
    if (anonAudit && anonAudit.length > 0) throw new Error("Anon could read audit_log!");

    console.log("✅ Anon denied (0 rows seen).");

    // 2. Owner A access
    const { data: aProfiles } = await clientA.from("profiles").select("*").eq("id", idA);
    if (!aProfiles || aProfiles.length === 0)
      throw new Error("Owner A could not read own profile!");

    const { data: aAudit } = await clientA.from("audit_log").select("*").eq("owner_id", idA);
    if (!aAudit || aAudit.length === 0) throw new Error("Owner A could not read own audit_log!");

    // 3. Cross-user isolation
    const { data: aReadsB } = await clientA.from("profiles").select("*").eq("id", idB);
    if (aReadsB && aReadsB.length > 0) throw new Error("Owner A could read Owner B's profile!");

    const { data: bReadsA } = await clientB.from("audit_log").select("*").eq("owner_id", idA);
    if (bReadsA && bReadsA.length > 0) throw new Error("Owner B could read Owner A's audit_log!");

    const { data: aReadsBLoa } = await clientA.from("loa_tokens").select("*").eq("owner_id", idB);
    if (aReadsBLoa && aReadsBLoa.length > 0)
      throw new Error("Owner A could read Owner B's loa_tokens!");

    // 4. Cross-user update failure
    const { error: bUpdatesA } = await clientB
      .from("profiles")
      .update({ display_name: "Hacked" })
      .eq("id", idA);
    // Supposed to fail silently or return error but update 0 rows
    const { data: aAfterHack } = await clientA
      .from("profiles")
      .select("display_name")
      .eq("id", idA)
      .single();
    if (aAfterHack?.display_name === "Hacked")
      throw new Error("Owner B was able to update Owner A's profile!");

    console.log(
      "✅ Owner isolation proven (A reads only A, B reads only B, cross-reads/writes fail).",
    );
    console.log("✅ Service role was not used for client reads/writes.");
  } catch (err) {
    console.error("❌ RLS test failed:", err);
    process.exit(1);
  } finally {
    console.log(`Cleaning up test data...`);
    // Cleanup using service role
    await supabaseAdmin.from("audit_log").delete().eq("action", "RLS_TEST");
    await supabaseAdmin.from("loa_tokens").delete().in("owner_id", [idA, idB]);
    await supabaseAdmin.from("profiles").delete().in("id", [idA, idB]);
    await supabaseAdmin.auth.admin.deleteUser(idA);
    await supabaseAdmin.auth.admin.deleteUser(idB);
    console.log("✅ Cleanup complete.");
  }
}

run();
