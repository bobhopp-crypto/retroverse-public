# Match Agent Phase 2 Report

**Run:** 2026-06-24T01:13:42.089Z  
**Mode:** DRY RUN (no label writes)  
**Database:** /Users/bobhopp/Library/Application Support/VirtualDJ/database.xml  
**Backup:** —

---

## Summary

| Metric | Count |
|--------|------:|
| Unmatched VIDEO tracks scanned | 50 |
| **Auto-Matched** (high confidence) | 37 |
| **Needs Review** | 8 |
| **No Candidate** | 5 |
| Labels written | 0 |
| Assign failed | 0 |
| Assign skipped (blocked label) | 0 |

---

## Auto-match rules

- Tier **A** — exact normalized artist + title
- OR combined confidence **≥ 95**

No manual confirmation for auto-matched rows.

---

## Outputs

- `auto-matched.csv`
- `needs-review.csv`
- `no-candidate.csv`
- `results.json`
