# VirtualDJ → RVTR Rematch Phase 2

Read-only analysis. No XML, PostgreSQL, Retroverse, Billboard, album, artwork, or enrichment writes were performed.

## Improvement

| Metric | Count |
|---|---:|
| Original automatic matches | 4,864 |
| New automatic matches after deterministic normalization | 4839 |
| Improvement | -25 |
| Remaining review queue | 3670 |
| Remaining no-match queue | 465 |
| Average accepted confidence | 100% |
| Average review confidence | 89% |
| Highest rejected confidence | 94% |
| Lowest accepted confidence | 98% |

## Failure classification

| Primary reason | Count |
|---|---:|
| Version differences | 6707 |
| Title punctuation | 1236 |
| Parentheses | 420 |
| Other | 185 |
| Live | 149 |
| feat./featuring | 63 |
| Spelling variation | 61 |
| Remix | 54 |
| Artist normalization | 34 |
| Clean/Dirty | 26 |
| No Billboard candidate | 16 |
| Extended mix | 11 |
| Radio edit | 9 |
| Karaoke | 3 |

## Confidence distribution

| Bucket | Count |
|---|---:|
| 100% | 4836 |
| 99% | 0 |
| 95–98% | 3 |
| 90–94% | 3407 |
| Below 90% | 728 |

## Review queue assessment

- Deterministic normalization candidates: 4839
- Alias candidates: Requires targeted alias evidence; not auto-assigned by this run.
- Track-family candidates: Existing matcher evidence is retained in the review CSV; no new relationship inference was added.
- Human review required: 4135

## Recommendation

Use only the 4839 accepted candidates for a later, separately approved XML write-back. Keep the 4135 remaining records out of the XML until reviewed.

Outputs: failure-classification.csv, remaining-review-queue.csv, top-100-review-sample.csv, and simulation.json.
