# Director Prototype 0.2 — Scene Template Validation

**Songs:** 5/5 · **Total scenes:** 41

## Summary

| Song | Scenes | Runtime | Templates | Layout Ready | Variety | Readiness |
|------|--------|---------|-----------|--------------|---------|-----------|
| Soho | 9 | 112s | Gallery×5, Hero×1, Chart×1, Quote×1, Closing×1 | 89% | 56% | Ready for Production |
| Erasure | 8 | 99s | Gallery×4, Hero×1, Chart×1, Quote×1, Closing×1 | 88% | 63% | Ready for Production |
| La Bouche | 8 | 99s | Chart×3, Gallery×2, Hero×1, Quote×1, Timeline×1 | 88% | 63% | Ready for Production |
| Celentano | 7 | 84s | Gallery×4, Hero×1, Quote×1, Closing×1 | 86% | 57% | Ready for Production |
| Squeeze | 9 | 112s | Gallery×5, Hero×1, Chart×1, Quote×1, Closing×1 | 89% | 56% | Ready for Production |

## Template Usage Statistics (all songs)

- **gallery:** 20 (49%)
- **chart:** 6 (15%)
- **hero:** 5 (12%)
- **quote:** 5 (12%)
- **closing:** 4 (10%)
- **timeline:** 1 (2%)

## Template Assignment Tables

### Soho — Hippychick

| # | Scene | Template | Conf | Layout |
|---|-------|----------|------|--------|
| 1 | Opening | Hero | 86% | Ready |
| 2 | How the song began | Gallery | 99% | Ready |
| 3 | Recording breakthrough | Gallery | 99% | Ready |
| 4 | Commercial success | Gallery | 99% | Ready |
| 5 | Cultural impact | Gallery | 99% | Ready |
| 6 | Legacy | Gallery | 99% | Ready |
| 7 | Chart milestone | Chart | 96% | Ready |
| 8 | Official Video | Quote | 86% | Needs Quote |
| 9 | Closing | Closing | 86% | Ready |

- Runtime: 112s · Variety: 56% · Readiness: Ready for Production
- Layout gaps: Scene 8 (Official Video): Needs Quote

### Erasure — Chains Of Love

| # | Scene | Template | Conf | Layout |
|---|-------|----------|------|--------|
| 1 | Opening | Hero | 86% | Ready |
| 2 | How the song began | Gallery | 99% | Ready |
| 3 | Recording breakthrough | Gallery | 99% | Ready |
| 4 | Commercial success | Gallery | 99% | Ready |
| 5 | Legacy | Gallery | 99% | Ready |
| 6 | Chart milestone | Chart | 96% | Ready |
| 7 | Official Video | Quote | 86% | Needs Quote |
| 8 | Closing | Closing | 86% | Ready |

- Runtime: 99s · Variety: 63% · Readiness: Ready for Production
- Layout gaps: Scene 7 (Official Video): Needs Quote

### La Bouche — Be My Lover

| # | Scene | Template | Conf | Layout |
|---|-------|----------|------|--------|
| 1 | Opening | Hero | 78% | Ready |
| 2 | How the song began | Chart | 99% | Ready |
| 3 | Recording breakthrough | Gallery | 88% | Ready |
| 4 | Commercial success | Chart | 99% | Ready |
| 5 | Legacy | Gallery | 88% | Ready |
| 6 | Chart milestone | Chart | 99% | Ready |
| 7 | Official Video | Quote | 72% | Needs Quote |
| 8 | Closing | Timeline | 75% | Ready |

- Runtime: 99s · Variety: 63% · Readiness: Ready for Production
- Layout gaps: Scene 7 (Official Video): Needs Quote

### Celentano — Prisencolinensinainciusol

| # | Scene | Template | Conf | Layout |
|---|-------|----------|------|--------|
| 1 | Opening | Hero | 86% | Ready |
| 2 | How the song began | Gallery | 99% | Ready |
| 3 | Recording breakthrough | Gallery | 99% | Ready |
| 4 | Cultural impact | Gallery | 99% | Ready |
| 5 | Legacy | Gallery | 99% | Ready |
| 6 | Official Video | Quote | 86% | Needs Quote |
| 7 | Closing | Closing | 86% | Ready |

- Runtime: 84s · Variety: 57% · Readiness: Ready for Production
- Layout gaps: Scene 6 (Official Video): Needs Quote

### Squeeze — Tempted

| # | Scene | Template | Conf | Layout |
|---|-------|----------|------|--------|
| 1 | Opening | Hero | 86% | Ready |
| 2 | How the song began | Gallery | 99% | Ready |
| 3 | Recording breakthrough | Gallery | 99% | Ready |
| 4 | Commercial success | Gallery | 99% | Ready |
| 5 | Cultural impact | Gallery | 99% | Ready |
| 6 | Legacy | Gallery | 99% | Ready |
| 7 | Chart milestone | Chart | 96% | Ready |
| 8 | Official Video | Quote | 86% | Needs Quote |
| 9 | Closing | Closing | 86% | Ready |

- Runtime: 112s · Variety: 56% · Readiness: Ready for Production
- Layout gaps: Scene 8 (Official Video): Needs Quote


## Variety Analysis

**Soho — Hippychick:**
- 5 consecutive "Gallery" scenes (scenes 2–6) — recommend variation
- Timeline template unused — chronological beats may benefit
- 5 consecutive "Gallery" scenes (scenes 2–6) — swap middle beat to Quote or Gallery

**Erasure — Chains Of Love:**
- 4 consecutive "Gallery" scenes (scenes 2–5) — recommend variation
- Timeline template unused — chronological beats may benefit
- 4 consecutive "Gallery" scenes (scenes 2–5) — swap middle beat to Quote or Gallery

**La Bouche — Be My Lover:** Good template spread

**Celentano — Prisencolinensinainciusol:**
- 4 consecutive "Gallery" scenes (scenes 2–5) — recommend variation
- Timeline template unused — chronological beats may benefit
- 4 consecutive "Gallery" scenes (scenes 2–5) — swap middle beat to Quote or Gallery

**Squeeze — Tempted:**
- 5 consecutive "Gallery" scenes (scenes 2–6) — recommend variation
- Timeline template unused — chronological beats may benefit
- 5 consecutive "Gallery" scenes (scenes 2–6) — swap middle beat to Quote or Gallery


## Asset Readiness

- **Soho — Hippychick:** 1 scene(s) need assets
- **Erasure — Chains Of Love:** 1 scene(s) need assets
- **La Bouche — Be My Lover:** 1 scene(s) need assets
- **Celentano — Prisencolinensinainciusol:** 1 scene(s) need assets
- **Squeeze — Tempted:** 1 scene(s) need assets

## Gaps Before Rendering

1. Renderer must map each `recommendedTemplate.templateId` to a layout component
2. Scenes with non-Ready layout need Editor asset pass or template downgrade rules
3. Consecutive same-template runs should trigger alternate template in 0.3 auto-variation
4. Gallery and Fact Stack templates rarely selected — need richer multi-fact / multi-image handoffs

## Recommendations for Director 0.3

1. **Auto-variation pass** — rewrite template when 3+ consecutive duplicates detected
2. **Template downgrade** — if layout not ready, pick next-best template with assets
3. **Scene transition hints** — planning-only fade/cut labels (still no animation engine)
4. **Renderer contract JSON** — export `director-render-spec.json` sibling to director.json
5. **Quote extraction** — Editor should flag quote-ready facts for Quote template

