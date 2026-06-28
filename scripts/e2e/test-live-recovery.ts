import process from "node:process";
import { createClient } from "@supabase/supabase-js";

// Force LIVE mode for the duration of this script
process.env["PLAYMONEY_MODE"] = "LIVE";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const timestamp = Date.now();
const email = `playmoney-live-test+${timestamp}@example.test`;
const password = `testpass-${timestamp}`;

async function run() {
  console.log(`Setting all gates to true...`);
  const gates = [
    "G-counsel",
    "G-noncustody",
    "G-loa",
    "G-geofence",
    "G-avenues",
    "G-contract",
    "G-pad",
    "G-causation",
    "G-fraud",
    "G-insurance",
  ];
  for (const gate of gates) {
    const { error } = await supabaseAdmin
      .from("go_live_attestations")
      .update({
        attested: true,
        attested_by: "test_script",
      })
      .eq("gate_key", gate);
    if (error) throw new Error(`Gate update failed: ${error.message}`);
  }

  console.log(`Creating test user...`);
  const { data: userData, error: errA } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (errA) throw errA;
  const userId = userData.user.id;

  try {
    console.log(`Seeding recovery data...`);
    // Insert into profiles
    await supabaseAdmin.from("profiles").insert([{ id: userId, display_name: "Live Test User" }]);

    const recoveryId = crypto.randomUUID();
    const { error: recErr } = await supabaseAdmin.from("recoveries").insert([
      {
        id: recoveryId,
        owner_id: userId,
        merchant: "TEST MERCHANT",
        avenue: "billing_error",
        reason: "Test",
        gross_amount_cents: 1000,
        user_net_cents: 750,
        our_fee_cents: 250,
        status: "needs_approval",
        idempotency_key: `init_${timestamp}`,
      },
    ]);
    if (recErr) throw new Error("Insert recovery failed: " + JSON.stringify(recErr));

    console.log(`Executing approveRecoveryFn (LIVE Mode dispatch)...`);

    // We import this dynamically after setting env var
    const { approveRecoveryFn } = await import("../../src/lib/api/recovery.functions");

    const approval = await approveRecoveryFn({
      data: {
        recoveryId,
        idempotencyKey: `approve_${timestamp}`,
        merchantContact: {
          method: "directory",
          url: "https://example.com/disputes",
          email: "playmoneywins@gmail.com", // This should receive the Resend email
        },
      },
    });

    console.log("Approval result:", approval);

    // Verify DB states
    const { data: recData } = await supabaseAdmin
      .from("recoveries")
      .select("status")
      .eq("id", recoveryId)
      .single();
    if (recData?.status !== "on_the_way") {
      throw new Error(`Expected status 'on_the_way', got ${recData?.status}`);
    }
    console.log("✅ Recovery status correctly updated to 'on_the_way'.");

    const { data: evData } = await supabaseAdmin
      .from("recovery_events")
      .select("*")
      .eq("recovery_id", recoveryId)
      .eq("kind", "outbound_dispatched")
      .single();
    if (!evData) {
      throw new Error("Missing 'outbound_dispatched' event");
    }
    console.log("✅ 'outbound_dispatched' event successfully recorded:", evData.note);
  } catch (err) {
    console.error("❌ LIVE Recovery Test failed:", err);
    process.exit(1);
  } finally {
    console.log(`Cleaning up...`);
    // Revert gates
    for (const gate of gates) {
      await supabaseAdmin
        .from("go_live_attestations")
        .update({
          attested: false,
          attested_by: null,
        })
        .eq("gate_key", gate);
    }

    // Clean user and data
    await supabaseAdmin.from("recovery_events").delete().eq("owner_id", userId);
    await supabaseAdmin.from("approvals").delete().eq("owner_id", userId);
    await supabaseAdmin.from("recoveries").delete().eq("owner_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.log("✅ Cleanup complete.");
  }
}

run();
