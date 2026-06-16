# Context Engineering Reference

## Sub-Agent Delegation

Fork context to specialized sub-agents for deep analysis.

### When to Delegate

- Complex research requiring multiple searches
- Specialized domain knowledge
- Parallel processing of independent tasks
- Deep dives that would consume primary context

### Delegation Pattern

```python
class ContextFork:
    def __init__(self, parent_context):
        self.parent = parent_context
        self.focused_context = self.extract_relevant(parent_context)

    def delegate(self, task: str) -> str:
        sub_agent = SubAgent(self.focused_context)
        result = sub_agent.execute(task)
        return self.merge_back(result)

    def extract_relevant(self, context: str) -> str:
        # Extract only context relevant to delegation task
        pass

    def merge_back(self, result: str) -> str:
        # Merge sub-agent results into parent context
        pass
```

---

## Sliding Window Protocols

Maintain a moving window of recent context.

### Window Types

| Window   | Size     | Use Case            |
| -------- | -------- | ------------------- |
| Micro    | 5 turns  | Immediate coherence |
| Standard | 20 turns | Working memory      |
| Macro    | 50 turns | Session context     |

### Implementation

```python
class SlidingWindow:
    def __init__(self, size=20):
        self.buffer = deque(maxlen=size)
        self.overflow = []

    def add(self, turn):
        if len(self.buffer) == self.buffer.maxlen:
            self.overflow.append(self.buffer[0])
        self.buffer.append(turn)

    def get_window(self):
        return list(self.buffer)

    def get_summary(self):
        return compress(self.overflow)
```

---

## Structured Note-Taking

Maintain external scratchpads for evolving constraints.

### Note Structure

```markdown
# Session Notes

## Active Constraints

- Deploy to AWS us-west-2
- Python 3.11+
- Docker containerization

## Open Questions

- [ ] Database migration strategy?
- [ ] Authentication method?

## Decisions Made

1. Use FastAPI (performance requirements)
2. PostgreSQL over MongoDB (relational needs)

## Technical Stack

- Framework: FastAPI
- Database: PostgreSQL
- Container: Docker
- Cloud: AWS
```

---

_APEX Business Systems Ltd. (C) 2025_
