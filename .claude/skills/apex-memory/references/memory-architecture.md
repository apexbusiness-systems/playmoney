# Memory Architecture Reference

## The 3-Tier System

APEX-Memory implements a hierarchical memory architecture inspired by human cognitive science.

### Tier 1: Short-Term Memory (Working Memory)

**Characteristics**:
- Holds the last 10-20 conversation turns
- 100% fidelity preservation
- Real-time updates with every turn
- No compression applied

**Promotion Criteria**:
- Referenced 3+ times across turns
- Explicitly flagged as important by user
- Contains critical constraints or decisions

**Implementation**:
```python
class ShortTermMemory:
    def __init__(self, capacity=20):
        self.buffer = deque(maxlen=capacity)
        self.reference_count = {}

    def add(self, turn):
        self.buffer.append(turn)
        self._update_references(turn)

    def promote_to_medium(self):
        return [t for t in self.buffer if self.reference_count[t.id] >= 3]
```

### Tier 2: Medium-Term Memory (Session Memory)

**Characteristics**:
- Compressed summaries of earlier turns
- ~90% accuracy target
- Key facts and entities only
- Updated every 10 turns

**Promotion Criteria**:
- Cross-topic relevance
- User preferences and constraints
- Frequently accessed information

**Compression Method**:
- Primacy-recency split
- Semantic deduplication
- Entity extraction and indexing

### Tier 3: Long-Term Memory (Persistent Memory)

**Characteristics**:
- Critical entities and constraints
- 95%+ accuracy requirement
- External storage (files, databases)
- Append-only (never deleted)

**Storage Format**:
```json
{
  "session_id": "abc123",
  "timestamp": "2025-02-12T22:00:00Z",
  "entities": ["AWS", "Python", "Docker"],
  "constraints": ["Deploy to us-west-2", "Use Python 3.11+"],
  "decisions": [
    {"decision": "Use FastAPI", "rationale": "Performance requirements"}
  ]
}
```

---

## Memory Flow Diagram

```
Input Turn
    ↓
Short-Term (Tier 1)
    ↓ [Referenced 3+ times]
Medium-Term (Tier 2)
    ↓ [Critical + Cross-topic]
Long-Term (Tier 3)
    ↓
External Storage
```

---

_APEX Business Systems Ltd. (C) 2025_
