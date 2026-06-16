# Compression Algorithms Reference

## Primacy-Recency Split

Based on cognitive science research showing humans remember beginnings and endings best.

### Algorithm

```python
def primacy_recency_split(text: str, primacy=0.20, recency=0.10):
    total = len(text)
    primacy_end = int(total * primacy)
    recency_start = int(total * (1 - recency))

    return {
        'primacy': text[:primacy_end],      # Keep verbatim
        'middle': text[primacy_end:recency_start],  # Compress this
        'recency': text[recency_start:]      # Keep verbatim
    }
```

### Why It Works

- **Primacy Effect**: First items establish context
- **Recency Effect**: Last items are most immediately relevant
- **Middle Compression**: Redundant details can be summarized

---

## Semantic Deduplication

Removes near-duplicate content using Jaccard similarity.

### Algorithm

```python
def jaccard_similarity(a: str, b: str) -> float:
    words_a = set(a.lower().split())
    words_b = set(b.lower().split())
    return len(words_a & words_b) / len(words_a | words_b)

def semantic_dedup(lines: list, threshold=0.75):
    kept = [lines[0]]
    for line in lines[1:]:
        is_duplicate = any(
            jaccard_similarity(line, k) >= threshold
            for k in kept[-15:]  # Sliding window
        )
        if not is_duplicate:
            kept.append(line)
    return kept
```

### Parameters

- **Threshold**: 0.75 (75% word overlap = duplicate)
- **Window**: Last 15 lines (prevents drift)
- **Case**: Normalized to lowercase

---

## Map-Reduce Summarization

Chunks large context and summarizes each chunk independently.

### Algorithm

```python
def map_reduce_compress(text: str, chunk_size=1000):
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    summaries = [summarize(chunk) for chunk in chunks]
    return ' '.join(summaries)

def summarize(chunk: str):
    # Extract highest-scoring sentences
    sentences = chunk.split('. ')
    scored = [(score_sentence(s), s) for s in sentences]
    scored.sort(reverse=True)
    return '. '.join([s for _, s in scored[:3]])
```

### Scoring Function

```python
def score_sentence(sent: str) -> float:
    score = 0.0
    score += len(re.findall(r'\b[A-Z][a-z]+\b', sent)) * 1.5  # Proper nouns
    score += len(re.findall(r'`[^`]+`', sent)) * 2.0  # Code references
    score += len(re.findall(r'\b\d+\b', sent)) * 0.5  # Numbers
    return score
```

---

## Research Citations

- **TITANS** (Google, 2025): Test-time memory adaptation
- **InfiniteHiP** (2025): Hierarchical pruning for long contexts
- **Anthropic Context Engineering** (2025): Sub-agent delegation patterns

---

_APEX Business Systems Ltd. (C) 2025_
