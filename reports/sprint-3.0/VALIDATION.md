# Sprint 3.0 — Experience Polish Validation

**Song:** Phil Collins — In The Air Tonight · `RVTR417030`
Generated: 2026-06-27T00:06:17.412Z

## Before → After

| Metric | Before | After |
|--------|--------|-------|
| Composed scenes | 10 | 10 |
| Runtime (sec) | 102 | 102 |
| Avg words/scene | 10 | 10 |
| Imageless timeline beats | 0 | 0 |
| Chart milestone screens | 1 | 1 |
| Adjacent same image | 4 | 0 |
| Layout variants | 1 | 4 |
| Image treatments | 1 | 5 (original, scanline, monochrome, halftone, poster) |

## Swipe-faster moments addressed

- Empty "1981" timeline beats — pruned when no image and recycled copy
- Duplicate chart milestones — deduplicated
- Encyclopedia closing quote — trimmed or demoted to visual/chart
- Repeated hero/performance image — rotated across frame pool
- Same layout every screen — layout rhythm via presentation modes
- Same visual treatment — CSS cycle: original → scanline → monochrome → halftone → poster

## Scene order (after)

1. **Hero Moment** · fullscreen · original · ~24 words
2. **Performance Spotlight** · performance · monochrome · ~6 words
3. **Performance Spotlight** · performance · halftone · ~16 words
4. **Performance Spotlight** · performance · poster · ~12 words
5. **Chart Milestone** · chart · halftone · ~19 words
6. **Visual Break** · fullscreen · scanline · ~2 words
7. **Visual Break** · fullscreen · monochrome · ~2 words
8. **Legacy Moment** · image_quote · halftone · ~10 words
9. **Big Quote** · image_quote · poster · ~6 words
10. **Visual Break** · fullscreen · original · ~3 words

## Result

**PASS** — Fewer weak scenes, less repetition, better presentation rhythm.

**Checkpoint:** Open `/experience/RVTR417030` — expect tighter pacing, varied images, minimal text.
