# Cross-Session Persistence Reference

## Session Dump Protocol

Generate portable memory dumps for handover between sessions.

### Dump Format

```markdown
# APEX-MEMORY SESSION DUMP [2025-02-12 22:00]

**Session ID**: abc123xyz
**Duration**: 2 hours 15 minutes
**Turn Count**: 47

**Narrative**:
User requested help with FastAPI deployment to AWS. We designed a Docker-based
architecture with PostgreSQL, configured CI/CD pipelines, and resolved
authentication issues. Project is deployment-ready.

**Critical Facts**:

- Deploy target: AWS us-west-2 (Source: Turn #3)
- Python version: 3.11+ required (Source: Turn #5)
- Database: PostgreSQL 15 (Source: Turn #12)
- Auth method: OAuth2 with JWT (Source: Turn #23)

**Entities**:

- Systems: AWS, Docker, PostgreSQL, FastAPI, GitHub Actions
- Files: Dockerfile, docker-compose.yml, .github/workflows/deploy.yml
- APIs: FastAPI app, OAuth2 endpoints

**Pending Actions**:

- [ ] Set up AWS RDS instance
- [ ] Configure domain DNS
- [ ] Run load tests

**Constraints**:

- Budget: <$100/month AWS costs
- Timeline: Deploy by end of week
- Security: Must pass OWASP top 10

**Context Hash**: a3f7b92e4c1d8f6a
```

---

## Handover Protocol

Load previous session dump to continue work.

### Loading Process

```python
def load_session_dump(dump_path: str):
    dump = parse_dump(dump_path)

    # Restore entities to index
    for entity in dump['entities']:
        entity_index.add(entity)

    # Restore constraints
    for constraint in dump['constraints']:
        active_constraints.add(constraint)

    # Restore pending actions
    for action in dump['pending_actions']:
        task_queue.add(action)

    # Verify hash
    verify_integrity(dump['context_hash'])
```

---

## Vector Database Storage

For long-term persistence across many sessions.

### Schema

```sql
CREATE TABLE apex_memory (
    id UUID PRIMARY KEY,
    session_id VARCHAR(255),
    timestamp TIMESTAMP,
    entity_type VARCHAR(50),
    entity_value TEXT,
    context TEXT,
    embedding VECTOR(1536),
    metadata JSONB
);

CREATE INDEX ON apex_memory USING ivfflat (embedding vector_cosine_ops);
```

### Retrieval

```python
def retrieve_memory(query: str, top_k=5):
    query_embedding = embed(query)
    results = db.execute(
        """
        SELECT entity_value, context, metadata
        FROM apex_memory
        ORDER BY embedding <=> %s
        LIMIT %s
        """,
        (query_embedding, top_k)
    )
    return results
```

---

_APEX Business Systems Ltd. (C) 2025_
