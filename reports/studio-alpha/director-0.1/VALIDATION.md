# Director Prototype 0.1 — Validation Report

**Songs processed:** 5/5
**Ready for Production:** 5/5
**Average runtime:** 101s (target 60–120s)
**Average scenes:** 8.2

## Summary Table

| RVTR | Artist | Scenes | Runtime | Style | Readiness |
|------|--------|--------|---------|-------|-----------|
| RVTR665372 | Soho | 9 | 112s | magazine_feature | Ready for Production |
| RVTR964817 | Erasure | 8 | 99s | magazine_feature | Ready for Production |
| RVTR558691 | La Bouche | 8 | 99s | countdown | Ready for Production |
| RVTR634395 | Adriano Celentano | 7 | 84s | magazine_feature | Ready for Production |
| RVTR720668 | Squeeze | 9 | 112s | magazine_feature | Ready for Production |

## Runtime Comparison

- **Hippychick:** 112s (9 scenes)
- **Chains Of Love:** 99s (8 scenes)
- **Be My Lover:** 99s (8 scenes)
- **Prisencolinensinainciusol:** 84s (7 scenes)
- **Tempted:** 112s (9 scenes)

## Readiness

- **Soho** — Ready for Production
- **Erasure** — Ready for Production
- **La Bouche** — Ready for Production
- **Adriano Celentano** — Ready for Production
- **Squeeze** — Ready for Production

## Experience Plans

### Soho — Hippychick

**RVTR:** RVTR665372 · **Readiness:** Ready for Production

- Scenes: 9 · Runtime: 112s
- Style: magazine_feature · Rhythm: moderate
- Performance: Official Video · 1990

**Scene list:**

1. [hero] Opening — 10s · images: 1 · facts: 1
2. [chart] How the song began — 14s · images: 2 · facts: 0
3. [story] Recording breakthrough — 16s · images: 2 · facts: 1
4. [chart] Commercial success — 14s · images: 2 · facts: 1
5. [story] Cultural impact — 13s · images: 2 · facts: 0
6. [story] Legacy — 13s · images: 2 · facts: 0
7. [chart] Chart milestone — 10s · images: 1 · facts: 1
8. [quote] Official Video — 10s · images: 1 · facts: 0
9. [closing] Closing — 12s · images: 1 · facts: 0

### Erasure — Chains Of Love

**RVTR:** RVTR964817 · **Readiness:** Ready for Production

- Scenes: 8 · Runtime: 99s
- Style: magazine_feature · Rhythm: moderate
- Performance: Official Video · 1988

**Scene list:**

1. [hero] Opening — 10s · images: 1 · facts: 1
2. [chart] How the song began — 14s · images: 2 · facts: 0
3. [story] Recording breakthrough — 16s · images: 2 · facts: 1
4. [chart] Commercial success — 14s · images: 2 · facts: 1
5. [story] Legacy — 13s · images: 2 · facts: 0
6. [chart] Chart milestone — 10s · images: 1 · facts: 1
7. [quote] Official Video — 10s · images: 1 · facts: 0
8. [closing] Closing — 12s · images: 1 · facts: 0

### La Bouche — Be My Lover

**RVTR:** RVTR558691 · **Readiness:** Ready for Production

- Scenes: 8 · Runtime: 99s
- Style: countdown · Rhythm: mixed
- Performance: Official Video · 1995

**Scene list:**

1. [hero] Opening — 10s · images: 1 · facts: 1
2. [chart] How the song began — 14s · images: 2 · facts: 0
3. [story] Recording breakthrough — 16s · images: 2 · facts: 1
4. [chart] Commercial success — 14s · images: 2 · facts: 1
5. [story] Legacy — 13s · images: 2 · facts: 0
6. [chart] Chart milestone — 10s · images: 1 · facts: 1
7. [quote] Official Video — 10s · images: 1 · facts: 0
8. [closing] Closing — 12s · images: 1 · facts: 0

### Adriano Celentano — Prisencolinensinainciusol

**RVTR:** RVTR634395 · **Readiness:** Ready for Production

- Scenes: 7 · Runtime: 84s
- Style: magazine_feature · Rhythm: moderate
- Performance: Official Video · 1973

**Scene list:**

1. [hero] Opening — 10s · images: 1 · facts: 1
2. [hero] How the song began — 10s · images: 2 · facts: 1
3. [story] Recording breakthrough — 16s · images: 2 · facts: 0
4. [story] Cultural impact — 13s · images: 2 · facts: 1
5. [story] Legacy — 13s · images: 2 · facts: 0
6. [quote] Official Video — 10s · images: 1 · facts: 0
7. [closing] Closing — 12s · images: 1 · facts: 0

### Squeeze — Tempted

**RVTR:** RVTR720668 · **Readiness:** Ready for Production

- Scenes: 9 · Runtime: 112s
- Style: magazine_feature · Rhythm: moderate
- Performance: Official Video · 1981

**Scene list:**

1. [hero] Opening — 10s · images: 1 · facts: 1
2. [chart] How the song began — 14s · images: 2 · facts: 1
3. [story] Recording breakthrough — 16s · images: 2 · facts: 2
4. [chart] Commercial success — 14s · images: 2 · facts: 2
5. [story] Cultural impact — 13s · images: 2 · facts: 2
6. [story] Legacy — 13s · images: 2 · facts: 1
7. [chart] Chart milestone — 10s · images: 1 · facts: 1
8. [quote] Official Video — 10s · images: 1 · facts: 0
9. [closing] Closing — 12s · images: 1 · facts: 0


## Missing Data Patterns

- None blocking across prototype set

## Recommendations before Director 0.2

1. **Rendering layer** — consume `director.json` scenes as a timeline spec (still no animations in 0.2 planning phase optional)
2. **Scene type → layout mapping** — Hero, Performance, Chart each get a layout template
3. **Handoff artist/title** — store explicitly on Editor meta to avoid subtitle parsing
4. **Key moment deduplication** — tighten overlap detection when beats already cover chart/performance
5. **Runtime tuning** — per-scene duration flags surfaced in Editor review before Director run

## Output files

Per song under `data/ops/intelligence/research-department/{RVTR}/`:

- `director-handoff.json` — Editor → Director input
- `director.json` — Experience Plan + Director Review

