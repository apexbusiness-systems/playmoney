#!/usr/bin/env python3
"""
APEX-Memory Hallucination Verifier
(C) 2025 APEX Business Systems Ltd. All Rights Reserved.

Audits responses for potential hallucinations against source context.
Exit codes: 0=verified, 1=hallucinations detected, 2=system error
"""

import sys, re, argparse
from pathlib import Path

def extract_claims(response: str) -> list:
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', response) if s.strip()]
    return sentences

def verify_claim(claim: str, context: str) -> dict:
    claim_lower = claim.lower()
    context_lower = context.lower()

    claim_words = set(re.findall(r'\b\w{4,}\b', claim_lower))
    context_words = set(re.findall(r'\b\w{4,}\b', context_lower))

    overlap = len(claim_words & context_words)
    coverage = overlap / max(1, len(claim_words))

    return {
        "claim": claim,
        "grounded": coverage >= 0.60,
        "confidence": round(coverage, 2),
        "warning": "Low grounding" if coverage < 0.60 else None
    }

def main():
    parser = argparse.ArgumentParser(description="APEX-Memory Hallucination Verifier")
    parser.add_argument("response", type=Path, help="Response file to verify")
    parser.add_argument("--context", "-c", type=Path, required=True, help="Source context file")
    args = parser.parse_args()

    if not args.response.exists():
        print(f"[NO] Response file not found: {args.response}", file=sys.stderr)
        sys.exit(2)

    if not args.context.exists():
        print(f"[NO] Context file not found: {args.context}", file=sys.stderr)
        sys.exit(2)

    response = args.response.read_text(encoding="utf-8")
    context = args.context.read_text(encoding="utf-8")

    claims = extract_claims(response)
    results = [verify_claim(claim, context) for claim in claims]

    hallucinations = [r for r in results if not r["grounded"]]

    print(f"[APEX-Memory Verify] Checked {len(claims)} claims")
    print(f"Grounded: {len(results) - len(hallucinations)}")
    print(f"Hallucinations: {len(hallucinations)}")

    if hallucinations:
        print("\n[WARNING] Potential hallucinations detected:")
        for h in hallucinations[:5]:
            print(f"  - {h['claim'][:80]}... (confidence: {h['confidence']})")
        sys.exit(1)
    else:
        print("\n[OK] All claims verified")
        sys.exit(0)

if __name__ == "__main__":
    main()
