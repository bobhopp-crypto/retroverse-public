# Safe SQL — Retroverse local graph (read-only)

**Database:** `retroverse` @ `localhost:5432`  
**User:** `bobhopp`

All files in this folder are **SELECT / EXPLAIN / COUNT / LIMIT only**. No mutations.

```bash
psql -h localhost -p 5432 -U bobhopp -d retroverse -f tools/sql/<file>.sql
```

Edit the variables at the top of each file (`\set` or comment placeholders) before running.

Workflow: [docs/postgres_query_workflow.md](../../docs/postgres_query_workflow.md)

| File | Purpose |
|------|---------|
| `album_link_recovery_audit.sql` | Hot 100 missing album links (read-only) |
| `track_album_link_healing_schema.sql` | Optional proposal log tables (run manually in dev) |

Album-link healing workflow: [docs/TRACK_ALBUM_LINK_HEALING.md](../../docs/TRACK_ALBUM_LINK_HEALING.md)

```bash
npm run track:audit-album-links
```
