// M6 · UPL Content Linter (Control #10) [GATE]
//
// PlayMoney is administrative, never legal (LPA s.106). This linter scans ALL
// generated copy and BLOCKS unauthorized-practice-of-law language: legal
// advice/opinion, demand letters, litigation threats, and offers of
// tribunal/court representation. Copy that fails cannot be rendered or sent.

export type UplRuleId =
  | "legal_advice"
  | "demand_letter"
  | "litigation_threat"
  | "court_representation";

interface UplRule {
  id: UplRuleId;
  description: string;
  pattern: RegExp;
}

const RULES: readonly UplRule[] = [
  {
    id: "legal_advice",
    description: "Legal advice / legal opinion (administrative tone only)",
    pattern:
      /\b(legal advice|legal opinion|as your (lawyer|attorney|counsel|solicitor)|we advise you to|you should sue|you have a (strong |valid )?legal (claim|case)|in our legal (view|judgment))\b/i,
  },
  {
    id: "demand_letter",
    description: "Demand-letter language",
    pattern:
      /\b(demand letter|hereby demand|formal demand|cease and desist|failure to comply (will|shall) result|you are hereby notified that you must)\b/i,
  },
  {
    id: "litigation_threat",
    description: "Litigation / legal-action threat",
    pattern:
      /\b(we will sue|sue you|take (you|them) to court|legal action (will|may) be taken|commence (a )?lawsuit|pursue litigation|see you in court)\b/i,
  },
  {
    id: "court_representation",
    description: "Offer to represent before a court/tribunal",
    pattern:
      /\b(represent you (in|before) (court|the tribunal|a tribunal)|act as your legal representative|appear (in court|before the tribunal) on your behalf)\b/i,
  },
];

export interface UplViolation {
  rule: UplRuleId;
  description: string;
  match: string;
}

export interface UplLintResult {
  clean: boolean;
  violations: UplViolation[];
}

export function lintCopy(text: string): UplLintResult {
  const violations: UplViolation[] = [];
  for (const rule of RULES) {
    const m = rule.pattern.exec(text);
    if (m) violations.push({ rule: rule.id, description: rule.description, match: m[0] });
  }
  return { clean: violations.length === 0, violations };
}

export class UplViolationError extends Error {
  readonly violations: UplViolation[];
  constructor(violations: UplViolation[]) {
    super(
      `BLOCKED: copy failed UPL linter — ${violations.map((v) => `${v.rule} ("${v.match}")`).join(", ")}`,
    );
    this.name = "UplViolationError";
    this.violations = violations;
  }
}

/** Guard for every copy-generation/send call site. Returns the text if clean. */
export function assertCleanCopy(text: string): string {
  const r = lintCopy(text);
  if (!r.clean) throw new UplViolationError(r.violations);
  return text;
}
