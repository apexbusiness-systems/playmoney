// DB-backed Go-Live gate plumbing (server-only, §6). Reads/writes the
// go_live_attestations store. Code builds the CHECK; OPS sets the flags — this
// module never auto-attests. External gates (G-counsel, G-insurance) are
// ops/legal facts and must be set by a named human via setGateAttestation.

import { getAdminClient } from "@/lib/supabase/admin.server";
import { GATE_KEYS, EMPTY_GATE_STATUS, type GateKey, type GateStatus } from "./gates";
import { appendAudit } from "./audit.server";

export async function loadGateStatus(): Promise<GateStatus> {
  const sb = getAdminClient();
  const { data, error } = await sb.from("go_live_attestations").select("gate_key, attested");
  if (error) throw new Error(`loadGateStatus failed: ${error.message}`);
  const status: Record<GateKey, boolean> = { ...EMPTY_GATE_STATUS };
  for (const row of data ?? []) {
    const key = row.gate_key as string;
    if ((GATE_KEYS as readonly string[]).includes(key)) {
      status[key as GateKey] = row.attested === true;
    }
  }
  return status;
}

/**
 * Ops/legal sign-off for a single gate. Requires a named attester and writes an
 * audit row. NEVER call this automatically from application logic — it is the
 * human-controlled flip described in §6.
 */
export async function setGateAttestation(input: {
  gateKey: GateKey;
  attested: boolean;
  attestedBy: string;
  evidenceUrl?: string;
  note?: string;
}): Promise<void> {
  if (!input.attestedBy?.trim()) {
    throw new Error("Gate attestation requires attestedBy (a named ops/legal sign-off)");
  }
  if (!(GATE_KEYS as readonly string[]).includes(input.gateKey)) {
    throw new Error(`Unknown gate key: ${input.gateKey}`);
  }
  const sb = getAdminClient();
  const { error } = await sb
    .from("go_live_attestations")
    .update({
      attested: input.attested,
      attested_by: input.attestedBy,
      evidence_url: input.evidenceUrl ?? null,
      note: input.note ?? null,
    })
    .eq("gate_key", input.gateKey);
  if (error) throw new Error(`setGateAttestation failed: ${error.message}`);

  await appendAudit({
    actor: input.attestedBy,
    action: "gate_attestation",
    detail: {
      gateKey: input.gateKey,
      attested: input.attested,
      evidenceUrl: input.evidenceUrl ?? null,
      note: input.note ?? null,
    },
  });
}
