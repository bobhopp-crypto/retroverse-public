# Experience Review — Showcase 001

**Song:** Phil Collins — In The Air Tonight
**RVTR:** RVTR417030
**Route:** /experience/RVTR417030

## Publication choice

**Selected:** MTV (`mtv`)

### Why MTV

- Song DNA: `television · breakthrough` with broadcast-stage lighting
- Owned performance is the 1981 Official Video — television-native artifact
- Art direction: Deep Olive palette, cinematic serif, kinetic camera energy
- Derived visual top scores: Charcoal Sketch, Television Scanline, 1980s Airbrush
- Publication affinities match: `television`, `broadcast`, `1980s`

Consistent MTV framing throughout — no mid-experience publication switching.

## Pipeline summary

| Metric | Value |
|--------|-------|
| Director scenes | 9 |
| Composed moments | 14 |
| Runtime | ~118s |
| Art direction | Deep Gold · Cinematic Serif · Balanced · Performance |
| Scene composer | active |

## Scene-by-scene review

### 1. Hero Moment

- **Headline:** In The Air Tonight: The Performance That Defined It
- **Copy:** 
- **Words:** ~9
- **Image:** yes
- **Importance:** high
- **Duration:** 8s

### 2. Performance Spotlight

- **Headline:** The performance setting
- **Copy:** Official Video (1981).
- **Words:** ~6
- **Image:** yes
- **Importance:** low
- **Duration:** 9s

### 3. Timeline Beat

- **Headline:** 1981
- **Copy:** The performance setting
- **Words:** ~4
- **Image:** no
- **Importance:** low
- **Duration:** 8s

### 4. Performance Spotlight

- **Headline:** How the song began
- **Copy:** Before the stage: "In The Air Tonight" entered the world in 1981.
- **Words:** ~16
- **Image:** yes
- **Importance:** low
- **Duration:** 9s

### 5. Timeline Beat

- **Headline:** 1981
- **Copy:** How the song began
- **Words:** ~5
- **Image:** no
- **Importance:** low
- **Duration:** 8s

### 6. Performance Spotlight

- **Headline:** Commercial success
- **Copy:** Billboard Hot 100 peak #19 · 17 weeks on chart.
- **Words:** ~12
- **Image:** yes
- **Importance:** low
- **Duration:** 8s

### 7. Chart Milestone

- **Headline:** Chart Milestone
- **Copy:** 
- **Words:** ~2
- **Image:** yes
- **Importance:** medium
- **Duration:** 8s

### 8. Visual Break

- **Headline:** Commercial success
- **Copy:** 
- **Words:** ~2
- **Image:** yes
- **Importance:** low
- **Duration:** 6s

### 9. Big Quote

- **Headline:** Cultural impact
- **Copy:** 4 cultural context notes

"In the Air Tonight" is a song by the English drummer and singer-songwriter Phil Collins.

It …
- **Words:** ~36
- **Image:** yes
- **Importance:** low
- **Duration:** 13s

### 10. Legacy Moment

- **Headline:** Legacy
- **Copy:** Why this performance still carries weight for patrons today.
- **Words:** ~10
- **Image:** yes
- **Importance:** low
- **Duration:** 19s

### 11. Chart Milestone

- **Headline:** Chart milestone
- **Copy:** Peaked at #19 on the Billboard Hot 100.
- **Words:** ~10
- **Image:** yes
- **Importance:** low
- **Duration:** 10s

### 12. Big Quote

- **Headline:** Official Video
- **Copy:** Owned performance: Official Video.
- **Words:** ~6
- **Image:** yes
- **Importance:** low
- **Duration:** 10s

### 13. Big Quote

- **Headline:** last chart fact
- **Copy:** Phil Collins's "In The Air Tonight" reached #19 on the Billboard Hot 100. "In the Air Tonight" is a song by the English …
- **Words:** ~49
- **Image:** yes
- **Importance:** high
- **Duration:** 12s

### 14. Timeline Beat

- **Headline:** 1981
- **Copy:** last chart fact
- **Words:** ~4
- **Image:** no
- **Importance:** high
- **Duration:** 8s

## Review findings

### Strongest moment

**Scene 1 — Hero Moment.** Full-bleed Official Video frame, performance-forward headline, minimal copy. This is the standard every scene should aspire to.

### Weakest moment

**Scene 13 — Big Quote (last chart fact).** ~49 words of encyclopedia hook repetition; Wikipedia definition stacked on chart fact. Feels like a generated report, not a curated close.

**Scene 9 — Cultural impact** runs close second: raw collector evidence dump instead of editorial distillation.

### Repeated imagery

Hero (`57e3365f84be`) and performance (`45d14cac4c20`) frames appear in 10+ of 14 moments. Close-up, alternate, and crowd frames underused until derived visual set adds styled variants.

### Unnecessary scenes

- **Scenes 3, 5, 14** — Timeline beats labeled "1981" with no image and recycled headline copy
- **Scenes 7 + 11** — Duplicate chart milestone beats (#19) should be one screen
- **Scene 8** — Visual break duplicating scene 6 headline (Commercial success)

### Text-heavy scenes

- **Scene 9** (~36 words) — Cultural impact with Wikipedia opener
- **Scene 13** (~49 words) — Closing chart fact with encyclopedia hook

Both should become visual-first with ≤15 words when a performance image is available.

### Scenes needing additional assets

- Drum-fill / Face Value recording context (no dedicated frame yet)
- Chart milestone visualization (#19 · 17 weeks)

### Full-screen visual moment candidates

- Close-up frame + Television Scanline or Minimal Ink derived visual
- Alternate angle + Concert Poster derived visual
- Crowd wide + Graphic Novel derived visual

## Art direction assessment

Profile: **Deep Gold · Cinematic Serif · Balanced · Performance**

Engine output aligns with 1981 broadcast aesthetic. Desired refinements (future general rules, not showcase exceptions):

1. Boost scanline/CRT motif weight when `lightingStyle === television`
2. Prefer performance layout over magazine when publication is MTV
3. Reduce body copy default length for `live_performance` angle
4. Auto-suppress compilation-year facts when `primaryNarrativeYear !== graph anchor year`

## Pipeline improvement recommendations

1. **Narrative blueprint on distill** — RVTR417030 had empty `storyBeats`; batch-a4 path must include all Director-ready songs
2. **Approve all extracted frames by default** when performance quality ≥ 9
3. **Year resolution guard** — closing beat must not default to compilation anchor year
4. **Derived visual persistence** — wire showcase manifest format into `loadDerivedVisuals()` when generation ships
5. **Publication in render spec** — store selected publication family on package (currently Lab-only)
6. **Scene importance pruning** — auto-merge low-importance fact scenes with adjacent performance moments
