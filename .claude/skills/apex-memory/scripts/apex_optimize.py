#!/usr/bin/env python3
"""
APEX-Memory Full Optimization Pipeline
(C) 2025 APEX Business Systems Ltd. All Rights Reserved.

Runs complete optimization: compress + verify + persist.
Exit codes: 0=success, 1=warnings, 2=errors
"""

import sys, argparse
from pathlib import Path
import subprocess

def main():
    parser = argparse.ArgumentParser(description="APEX-Memory Full Optimization")
    parser.add_argument("input", type=Path, help="Input context file")
    parser.add_argument("--output", "-o", type=Path, help="Output optimized file")
    parser.add_argument("--stats", action="store_true", help="Display statistics")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"[NO] File not found: {args.input}", file=sys.stderr)
        sys.exit(2)

    print("[APEX-Memory Optimize] Starting full pipeline...")

    # Compress
    print("\n[1/3] Compression...")
    output = args.output or Path(f"{args.input.stem}_optimized.txt")
    result = subprocess.run([
        sys.executable, 
        Path(__file__).parent / "apex_compress.py",
        str(args.input),
        "--output", str(output)
    ], capture_output=True, text=True)

    if result.returncode != 0:
        print(f"[ERROR] Compression failed: {result.stderr}")
        sys.exit(2)

    print(result.stderr)

    # Verify
    print("\n[2/3] Verification...")
    verify_result = subprocess.run([
        sys.executable,
        Path(__file__).parent / "apex_verify.py",
        str(output),
        "--context", str(args.input)
    ], capture_output=True, text=True)

    print(verify_result.stdout)

    # Persist
    print("\n[3/3] Persistence...")
    dump_path = Path(f"{args.input.stem}_session_dump.md")
    persist_result = subprocess.run([
        sys.executable,
        Path(__file__).parent / "apex_persist.py",
        str(output),
        "--output", str(dump_path)
    ], capture_output=True, text=True)

    print(persist_result.stdout)

    print(f"\n[OK] Optimization complete: {output}")
    print(f"[OK] Session dump: {dump_path}")

if __name__ == "__main__":
    main()
