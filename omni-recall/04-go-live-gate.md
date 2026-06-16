# 04 · Go-Live Gate (build the switch; leave it OFF)

`PLAYMONEY_MODE` ∈ { BUILT, LIVE }, **default BUILT**. A computed predicate `canGoLive()`
returns true ONLY when every gate below is green. Live-only paths (real onboarding, real
execution, real fee capture) must be guarded by `mode === LIVE && canGoLive()` AND each
action re-checks its own gate. Externally-attested gates are config attestations with audit
records: build the check; **ops sets the flag — never auto-set.**

## Gate predicates (each must be green)

| Gate         | Meaning                                                             | Source                             |
| ------------ | ------------------------------------------------------------------- | ---------------------------------- |
| G-counsel    | External Alberta fintech counsel counter-signed                     | external (ops attestation + audit) |
| G-noncustody | Non-custodial flow verified end-to-end; no PlayMoney fund path      | test §5 (T1)                       |
| G-loa        | e-LOA live, gating every execute action                             | test §5 (T3)                       |
| G-geofence   | Alberta ON; all other provinces + US OFF                            | config + test (T4)                 |
| G-avenues    | Only the 4 administrative avenues; ins/credit/DTC hard-OFF          | config + test (T5)                 |
| G-contract   | CPA internet-sales ToS + Privacy Policy published; consent captured | data + test                        |
| G-pad        | PAD/card consent (Rule H1) w/ advance notice + cancellation         | test §5 (T... PAD)                 |
| G-causation  | Fee-causation rule + DIY-free disclosure live                       | test §5 (T2)                       |
| G-fraud      | Fraud/chargeback controls + human-review-before-send live           | test §5 (T7)                       |
| G-insurance  | E&O + cyber bound (no AI exclusion); APEX Ltd. contracting party    | external                           |

**G-counsel and G-insurance are ops/legal facts — NOT self-satisfiable in code.** Build the
attestation + audit plumbing; never auto-set them. Do NOT advise on their legal sufficiency.

## §5 verification assertions (write as tests)

- T1 No schema type/table can hold user funds (negative test).
- T2 Fee impossible without ConfirmedRecovery + causation + disclosure ack.
- T3 Execute path rejects any action lacking a valid scoped e-LOA token.
- T4 Onboarding rejects non-Alberta; province/country flags default OFF.
- T5 Disabled avenues (insurance/credit/DTC/US) unreachable, not hidden.
- T6 UPL linter blocks legal-advice / demand / litigation-threat copy.
- T7 No send/execute without passing the human-review queue.
- T8 Notifications emit only money_landed / needs_signature.
- T9 Every new table enforces RLS (cross-tenant denied).
- T10 `canGoLive()` false while any gate unmet; default mode BUILT.
