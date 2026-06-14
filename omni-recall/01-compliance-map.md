# 01 · Compliance-as-Architecture Map (Rev.3, Alberta-first)

The target spec. `[GATE]` = must be green before BUILT→LIVE. All rows = BUILD NOW (code only).

| # | Legal condition (regime) | Technical control | Enforced where | Status |
|---|--------------------------|-------------------|----------------|--------|
| 1 | Non-custodial; funds land in user's own acct (PCMLTFA/RPAA) | No FBO/escrow/pooled fund table; destination = user's own payout ref | Data model: no fund table; type forbids | NOW [GATE] |
| 2 | No netting; never deduct fee from funds held (RPAA) | Fee = separate charge; never subtracted from recovery in transit | FeeLedger independent of payout path | NOW |
| 3 | Read-only bank data, OAuth, no stored creds (CDB/PIPEDA) | `AccountDataPort` = read-only aggregator tokens (Flinks/Plaid); no creds; no payment-init scope | Adapter contract + secret policy | NOW |
| 4 | Fee via registered PSP, PlayMoney as merchant (RPAA) | `PayoutPort` = Stripe/PSP merchant charge only; no wallet/stored-value | Adapter typed fee-only | NOW [GATE] |
| 5 | Never advance/front/guarantee a recovery (no lending) | No instant-cash/advance; fee attaches only post-recovery | Product scope + fee engine | NOW |
| 6 | LOA-primary authorization (LPA; ETA SA) | Per-recovery, revocable, scope-limited e-LOA; assignment only if counterparty requires AND non-custodial | Authorization module; valid e-sign | NOW [GATE] |
| 7 | MAN Mode; no execute without authorization | Executor requires valid LOA token per action; human-review-before-send | Guardrails layer | NOW [GATE] |
| 8 | Alberta geofence at MVP; provinces staged; US deferred | Hard signup gate to AB; province+country flags default OFF; Quebec = separate gated project | Onboarding eligibility + flags | NOW [GATE] |
| 9 | Four administrative avenues only; ins/credit/DTC/US off | Avenue registry; deferred avenues hard-DISABLED (not hidden) | Avenue module flags | NOW |
| 10 | UPL guardrails; administrative not legal (LPA s.106) | Templates only; no legal advice/demand/litigation-threat; content linter | Engine content controls | NOW [GATE] |
| 11 | Consumer e-contract (Alberta CPA C-26.3 internet sales) | ToS = internet-sales agreement: total cost, fee basis, cancellation rights, delivered copy | ToS + acceptance record | NOW [GATE] |
| 12 | PAD / card-on-file consent (Payments Canada Rule H1) | Rule H1 PAD or card-on-file consent; advance notice of amount/date; cancellation/recourse | Fee-consent module | NOW [GATE] |
| 13 | Fee-causation fairness (CPA unfair practices) | Charge ONLY recoveries PlayMoney materially caused; tight "confirmed recovery" def; DIY-free disclosure; benchmark 20–30% | Fee engine causation rule + disclosure UI | NOW [GATE] |
| 14 | Fraud / friendly-chargeback guardrails (UDAP-analog) | Legitimacy attestation; evidence capture; human-review-before-send; abuse monitoring | Pre-send review queue + attestation | NOW [GATE] |
| 15 | Privacy: PIPEDA + Alberta PIPA (breach s.10.1) | Express consent; purpose limitation; retention; breach-response; data-min; export/delete; RLS | Consent + retention + RLS modules | NOW [GATE] |
| 16 | CASL (SC 2010 c23; s.31) | Transactional carve-out; consent mgmt for CEM; money-only notifications | Notification module (typed) | NOW |
| 17 | Founder shield (BCA B-9; CASL s.31) | Operate via APEX Ltd; bind E&O + cyber, no AI/automated-decisioning exclusion | Corporate + insurance (OPS, not code) | [GATE] |

## 7 modules to build (§3)
- **M1** e-LOA / Authorization (#6) [GATE]
- **M2** Eligibility / Geofence gate (#8) [GATE]
- **M3** Consumer e-contract + PAD/Consent (#11,#12) [GATE]
- **M4** Fee-Causation engine (#13) [GATE] — default fee 25% in 20–30% band, configurable
- **M5** Fraud/Abuse + Human-Review-Before-Send queue (#14) [GATE]
- **M6** UPL Content Linter (#10) [GATE]
- **M7** Deferred-Avenue hard flags (#9)
