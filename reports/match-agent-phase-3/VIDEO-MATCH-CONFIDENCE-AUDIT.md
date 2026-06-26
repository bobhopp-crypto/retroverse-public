# VIDEO Match Confidence Audit

**Scanned:** 2026-06-24T04:32:22.553Z  
**Matched VIDEO tracks:** 8,476  
Read-only — no assignments modified.

---

## Confidence buckets

| Bucket | Count | % | Criteria summary |
|--------|------:|--:|------------------|
| **Exact** | 4157 | 49% | Canonical identity, artist ≥95, title ≥95, base title ≥90, no wrong-layer |
| **High** | 663 | 7.8% | Canonical identity, artist ≥80, title ≥88, combined ≥92 |
| **Medium** | 3572 | 42.1% | Canonical ≥65/65/68 OR VDJ exact-file match without wrong-layer |
| **Low** | 47 | 0.6% | Partial match (combined ≥55 or both dimensions ≥50) |
| **Suspicious** | 37 | 0.4% | Inversion, missing graph, or scores below trust floor |

---

## By identity_source

| identity_source | Exact | High | Medium | Low | Suspicious |
|-----------------|------:|-----:|-------:|----:|-----------:|
| `hot100` | 859 | 507 | 53 | 31 | 32 |
| `hot100_vdj` | 3298 | 156 | 22 | 6 | 3 |
| `vdj` | 0 | 0 | 3497 | 10 | 2 |

---

## Outputs

- `least-trustworthy-500.csv` — lowest trustScore matches
- `video-match-confidence-audit.json` — full classification
