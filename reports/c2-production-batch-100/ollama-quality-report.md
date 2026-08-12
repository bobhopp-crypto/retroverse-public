# Ollama Quality Report

- Model: **qwen3:8b**
- First-pass or final local passes: **12/100**
- Retry recoveries: **5**
- Failed after one retry: **88**
- Cloud escalation eligible: **88**
- Cloud escalation performed: **0** — OPENAI_API_KEY was unavailable
- Human review required: **88**
- Word count range: 123–212; average 170
- Internal leakage flagged: 7
- Generic/puff or structural gate failures: 86

The local model received only Collector-derived verified facts plus structured Retroverse enrichment. The batch did not silently substitute rules-based prose for failed local outputs.
