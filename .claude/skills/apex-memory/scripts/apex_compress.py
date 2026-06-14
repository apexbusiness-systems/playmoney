#!/usr/bin/env python3
"""
APEX-Memory Context Compressor
(C) 2025 APEX Business Systems Ltd. All Rights Reserved.

Standalone compression tool implementing primacy-recency + semantic dedup + map-reduce.
Exit codes: 0=success, 1=input error, 2=system error
"""

import sys, re, json, hashlib, argparse
from pathlib import Path
from datetime import datetime

def count_tokens(text: str) -> int:
    return max(1, int(len(text.split()) * 1.3))

def jaccard_similarity(a: str, b: str) -> float:
    words_a = set(a.lower().split())
    words_b = set(b.lower().split())
    if not words_a or not words_b:
        return 0.0
    return len(words_a & words_b) / len(words_a | words_b)

def semantic_dedup(lines: list, threshold: float = 0.75) -> list:
    if not lines:
        return lines
    kept = [lines[0]]
    for line in lines[1:]:
        if not line.strip():
            kept.append(line)
            continue
        is_dup = any(jaccard_similarity(line, k) >= threshold for k in kept[-15:] if k.strip())
        if not is_dup:
            kept.append(line)
    return kept

def compress_context(text: str, ratio: int = 5) -> dict:
    original_tokens = count_tokens(text)
    lines = text.split("\n")
    deduped_lines = semantic_dedup(lines)
    deduped = "\n".join(deduped_lines)

    total = len(deduped)
    primacy = deduped[:int(total * 0.20)]
    middle = deduped[int(total * 0.20):int(total * 0.90)]
    recency = deduped[int(total * 0.90):]

    sentences = [s.strip() for s in re.split(r'(?<=[.!?\n])\s+', middle) if s.strip()]
    kept = sentences[:max(3, len(sentences) // ratio)]
    compressed_middle = ". ".join(kept)

    result = primacy + "\n\n[--- COMPRESSED ZONE ---]\n\n" + compressed_middle + "\n\n[--- END COMPRESSED ---]\n\n" + recency
    compressed_tokens = count_tokens(result)

    return {
        "compressed_text": result,
        "original_tokens": original_tokens,
        "compressed_tokens": compressed_tokens,
        "ratio": round(original_tokens / max(1, compressed_tokens), 2),
        "savings_pct": round((1 - compressed_tokens / max(1, original_tokens)) * 100, 1),
        "dedup_removed": len(lines) - len(deduped_lines),
        "hash": hashlib.sha256(result.encode()).hexdigest()[:16],
    }

def main():
    parser = argparse.ArgumentParser(description="APEX-Memory Context Compressor")
    parser.add_argument("input", type=Path, help="Input context file")
    parser.add_argument("--output", "-o", type=Path, help="Output file")
    parser.add_argument("--ratio", "-r", type=int, default=5, help="Compression ratio (default: 5)")
    parser.add_argument("--json", "-j", action="store_true", help="Output stats as JSON")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"[NO] File not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    text = args.input.read_text(encoding="utf-8")
    result = compress_context(text, ratio=args.ratio)

    if args.json:
        print(json.dumps({
            "tool": "APEX-Memory Compress v2.0.0",
            "timestamp": datetime.now().isoformat(),
            "input": str(args.input),
            "original_tokens": result["original_tokens"],
            "compressed_tokens": result["compressed_tokens"],
            "ratio": result["ratio"],
            "savings_pct": result["savings_pct"],
            "hash": result["hash"],
        }, indent=2))
    elif args.output:
        args.output.write_text(result["compressed_text"], encoding="utf-8")
        print(f"[OK] Compressed {result['original_tokens']} -> {result['compressed_tokens']} tokens ({result['ratio']}:1)")
    else:
        print(result["compressed_text"])

if __name__ == "__main__":
    main()
