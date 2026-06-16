---
name: apex-memory
description: "Optimize AI context retention, prevent hallucinations, and persist memory across sessions. Auto-activates on long conversations and complex tasks."
license: "Proprietary - APEX Business Systems Ltd. Edmonton, AB, Canada. https://apexbusiness-systems.com"
---

# APEX-MEMORY

**Mission**: Exponentially enhance AI memory and context retention through intelligent compression, verification, and persistence protocols.

## CONTRACT

**Input**: Any long-context conversation, complex task, or multi-session workflow  
**Output**: Optimized context window with >90% information retention and <1% hallucination rate  
**Success**: Reference facts from 50+ turns ago with perfect accuracy and zero drift

---

## DECISION TREE (Start Here)

**What is the current memory state?**

```
CONTEXT STATE?
├─ NEW SESSION / LOW CONTEXT (<4k tokens)
│  → Action: Initialize Short-Term Memory
│  → Wait for 5 user turns before first compression
│
├─ MEDIUM CONTEXT (4k-32k tokens)
│  → Action: COMPRESSION PROTOCOL (Section: Compression)
│  → Focus: Summarize turns 1-(N-5), preserve last 5 verbatim
│  → Run deduplication scan every 10 turns
│
├─ HIGH CONTEXT (>32k tokens)
│  → Action: DEEP OPTIMIZATION + HALLUCINATION CHECK
│  → Focus: Aggressive map-reduce summarization
│  → Promote critical facts to Long-Term Memory
│  → Consider: references/context-engineering.md
│
└─ SESSION END / TRANSITION
   → Action: PERSISTENCE PROTOCOL (Section: Persistence)
   → Focus: Consolidate memory into portable summary
```

---

## COMPRESSION PROTOCOL

**Trigger**: Every 10 turns OR when context > 75% full

### Common Failures

❌ **NEVER**:

- Summarize code blocks (keep verbatim with line refs)
- Compress user instructions (keep verbatim)
- Remove "Attention Sinks" (first 4 tokens of conversation)
- Delete the most recent 5 turns (recency zone)
- Merge distinct topics into a single summary

✅ **ALWAYS**:

- Primacy-Recency Split: Preserve first 20% + last 10% verbatim
- Semantic Dedup: Scan for >80% similar blocks
- Map-Reduce: Chunk middle context (1000 tok/chunk)
- Entity Extraction: Extract ALL named entities before compression
- Quality Gate: Verify fact retention >=90%

### Example: Compression Execution

```javascript
// Primacy-Recency Split
const totalTurns = conversation.length;
const primacy = conversation.slice(0, Math.floor(totalTurns * 0.2));
const recency = conversation.slice(-Math.floor(totalTurns * 0.1));
const middle = conversation.slice(primacy.length, -recency.length);

// Compress middle only
const compressed = {
  primacy: primacy, // Keep verbatim
  middle: compress(middle, {
    ratio: 5,
    preserveEntities: true,
    dedupThreshold: 0.8,
  }),
  recency: recency, // Keep verbatim
};
```

### Using the Script

```bash
# Compress with verification
python scripts/apex_compress.py input.txt --ratio 5 --output compressed.txt

# Example output:
# ✅ Compressed 45,000 → 9,000 tokens (80% reduction)
# ✅ Fact retention: 92.3%
# ✅ Entities preserved: 47/47
```

**Deep Dive**: See `references/compression-algorithms.md` for algorithms

---

## VERIFICATION PROTOCOL

**Trigger**: Every response containing specific factual claims about context

### Decision Tree

```
CLAIM TYPE?
├─ General knowledge (e.g., "Python is interpreted")
│  → State directly. No verification needed.
│
├─ Context-specific fact (e.g., "User's deploy target is AWS")
│  ├─ Found in Memory Tiers (with Turn #)?
│  │  → State fact. Internally cite source turn.
│  │
│  └─ NOT found in any Memory Tier?
│     → STOP. Say: "I don't have that in our current context."
│     → NEVER fabricate. NEVER guess. NEVER infer without flagging.
│
├─ Inferred conclusion (e.g., "Based on the error, the issue is X")
│  → State with hedge: "Based on [evidence], it appears that..."
│  → Cite the evidence explicitly.
│
└─ Future/temporal claim (beyond knowledge cutoff)
   → BLOCK. State cutoff boundary.
```

### Common Failures

❌ **Hallucination Traps**:

- Making up specific details not in context
- Confusing conversations or mixing sessions
- Inferring without evidence flags
- Claiming certainty about uncertain information

✅ **Correct Approach**:

```python
# Example: Fact verification before stating
def verify_claim(claim: str, memory_tiers: list) -> bool:
    """Check claim against all memory tiers"""
    for tier in memory_tiers:
        if find_evidence(claim, tier):
            return True
    return False

# If not verified
if not verify_claim("User uses AWS"):
    return "I don't have information about your cloud provider in our current context."
```

### Using the Script

```bash
# Audit response for hallucinations
python scripts/apex_verify.py response.txt --context conversation.txt

# Example output:
# ✅ 12/12 claims verified
# ⚠️  Claim: "Project uses React" - No evidence found (Turn: N/A)
```

**Deep Dive**: See `references/hallucination-prevention.md`

---

## PERSISTENCE PROTOCOL

**Trigger**: "Save context", "Wrap up", session end, or explicit user request

### Execution Steps

1. **Extract**: All People, Systems, Files, APIs, Decisions, Constraints
2. **Summarize**: 3-sentence narrative of what was accomplished
3. **Pending**: List all open loops and unfinished actions
4. **Output Format**:

```markdown
# APEX-MEMORY SESSION DUMP [2025-02-13 11:27]

**Session ID**: apex-session-abc123
**Narrative**: Built authentication system for APEX-OmniHub. Implemented JWT tokens with Redis caching. Deployed to staging environment.

**Critical Facts**:

- JWT expiry: 24h (Source: Turn #12)
- Redis host: redis.apex.internal:6379 (Source: Turn #18)
- Staging URL: https://staging.omnihub.io (Source: Turn #23)

**Entities**:

- People: [Sarah Chen - Product Manager, Mike Rodriguez - DevOps]
- Systems: [Redis, PostgreSQL, NGINX]
- Files: [auth.service.ts, redis.config.js, deploy.yaml]

**Pending Actions**:

- [ ] Set up production Redis cluster
- [ ] Document JWT refresh flow
- [ ] Run load tests on staging

**Constraints**:

- Must support 10k concurrent users
- GDPR compliance required for EU users
- Zero downtime deployments mandatory

**Context Hash**: sha256:a3f5b9c2...
```

### Using the Script

```bash
# Generate session dump
python scripts/apex_persist.py conversation.txt --output memory_dump.md

# Full pipeline
python scripts/apex_optimize.py input.txt --stats --output optimized.txt
```

**Deep Dive**: See `references/cross-session-persistence.md`

---

## 3-TIER MEMORY ARCHITECTURE

```
TIER 1: SHORT-TERM (Working Memory)
├─ Last 10-20 turns
├─ 100% fidelity
├─ Real-time updates
└─ PROMOTE when: referenced 3+ times, flagged important

TIER 2: MEDIUM-TERM (Session Memory)
├─ Compressed summaries
├─ 90% accuracy
├─ Key facts only
└─ PROMOTE when: cross-topic relevance, user preference

TIER 3: LONG-TERM (Persistent Memory)
├─ Critical entities + constraints
├─ 95%+ accuracy
├─ External storage (files, logs, vector DB)
└─ NEVER deleted. Append-only.
```

**Deep Dive**: See `references/memory-architecture.md`

---

## ADVANCED CAPABILITIES

Load these references on-demand for complex scenarios:

- **Sub-Agent Delegation**: Fork context for deep research → `references/context-engineering.md`
- **Multi-Agent Coordination**: Share memory across agent swarms → `references/multi-agent-coordination.md`
- **Structured Note-Taking**: Maintain external scratchpads for evolving constraints
- **Context Compaction**: Emergency reset with tabular state transfer

---

## ACTIVATION

### Auto-Activation (No Manual Invocation)

This skill automatically activates during:

- Long conversations (>10 messages)
- Complex multi-step reasoning
- Information-dense interactions
- Cross-session continuity requirements

### Manual Overrides (Optional)

```
"Activate APEX-Memory maximum capacity" → Full deep optimization
"APEX-Memory compress"                  → Force immediate compression
"APEX-Memory stats"                     → Display optimization metrics
"APEX-Memory persist"                   → Generate session dump
"APEX-Memory verify"                    → Audit current response
```

---

## SCRIPTS REFERENCE

All scripts follow deterministic execution patterns:

```bash
# Compress with quality verification
python scripts/apex_compress.py input.txt --ratio 5 --output compressed.txt

# Audit response for hallucinations
python scripts/apex_verify.py response.txt --context conversation.txt

# Generate session memory dump
python scripts/apex_persist.py conversation.txt --output memory_dump.md

# Full optimization pipeline
python scripts/apex_optimize.py input.txt --stats --output optimized.txt
```

Exit codes: `0=success`, `1=input error`, `2=system error`

---

_APEX-Memory v2.0.0 — Proprietary Technology of APEX Business Systems Ltd._  
_Patent Pending. All Rights Reserved._
