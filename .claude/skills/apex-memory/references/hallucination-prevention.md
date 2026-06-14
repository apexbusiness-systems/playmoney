# Hallucination Prevention Reference

## Zero-Drift Verification Protocol

Ensures every claim is grounded in source context.

### Verification Decision Tree

```
CLAIM → Extract → Check Memory Tiers → Found?
                                          ↓ YES
                                    State + Cite Turn
                                          ↓ NO
                                    Flag as UNKNOWN
```

### Implementation

```python
class VerificationEngine:
    def __init__(self, memory_tiers):
        self.memory = memory_tiers
        self.entity_index = {}

    def verify_claim(self, claim: str) -> dict:
        # Extract entities from claim
        entities = self.extract_entities(claim)

        # Search all memory tiers
        for tier in self.memory:
            if tier.contains(entities):
                return {
                    'verified': True,
                    'source': tier.turn_number,
                    'confidence': tier.confidence
                }

        return {'verified': False, 'action': 'BLOCK'}
```

---

## Confidence Scoring

Every fact receives a confidence score.

### Scoring Criteria

| Factor | Weight | Description |
|--------|--------|-------------|
| Exact match | 1.0 | Verbatim in source |
| Semantic match | 0.8 | Paraphrased but accurate |
| Inferred | 0.6 | Derived from evidence |
| Unknown | 0.0 | Not in source |

### Thresholds

- **≥0.9**: State as fact
- **0.6-0.89**: State with hedge ("appears", "suggests")
- **<0.6**: Block or flag as unknown

---

## Attention Sink Preservation

Never compress the first 4 tokens of a conversation.

### Why?

Research shows transformer models use initial tokens as "attention sinks" for internal state management. Removing them degrades performance.

### Implementation

```python
def preserve_attention_sink(text: str) -> str:
    tokens = text.split()[:4]
    rest = text.split()[4:]
    compressed_rest = compress(rest)
    return ' '.join(tokens) + ' ' + compressed_rest
```

---

## Entity Extraction and Indexing

Maintain a searchable index of all named entities.

### Entity Types

- **People**: Names, roles
- **Systems**: APIs, databases, services
- **Files**: Paths, documents
- **Decisions**: Choices made, rationale
- **Constraints**: Rules, preferences

### Index Structure

```python
{
  "AWS": {
    "type": "system",
    "turns": [3, 7, 12],
    "context": "Cloud provider for deployment"
  },
  "Python 3.11": {
    "type": "constraint",
    "turns": [5],
    "context": "Minimum version requirement"
  }
}
```

---

_APEX Business Systems Ltd. (C) 2025_
