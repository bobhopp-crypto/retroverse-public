# Safe SQL — Retroverse local graph (read-only)

**Database:** `retroverse` @ `localhost:5432`  
**User:** `bobhopp`

All files in this folder are **SELECT / EXPLAIN / COUNT / LIMIT only**. No mutations.

```bash
psql -h localhost -p 5432 -U bobhopp -d retroverse -f tools/sql/<file>.sql
```

Edit the variables at the top of each file (`\set` or comment placeholders) before running.

Workflow: [docs/postgres_query_workflow.md](../../docs/postgres_query_workflow.md)
