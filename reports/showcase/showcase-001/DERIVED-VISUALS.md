# Derived Visual Set — Showcase 001

**Song:** Phil Collins — In The Air Tonight (RVTR417030)
**Count:** 10 derived visuals — **all generated** (showcase assets; not wired to production `loadDerivedVisuals()`)

| # | Style | Source frame | Output |
|---|-------|--------------|--------|
| 1 | Charcoal Sketch | hero.jpg | `reports/showcase/showcase-001/derived-visuals/charcoal_sketch-hero.png` |
| 2 | Magazine Illustration | performance.jpg | `reports/showcase/showcase-001/derived-visuals/magazine_illustration-performance.png` |
| 3 | Concert Poster | alternate.jpg | `reports/showcase/showcase-001/derived-visuals/concert_poster-alternate.png` |
| 4 | Monochrome Blue | close-up.jpg | `reports/showcase/showcase-001/derived-visuals/monochrome_blue-close-up.png` |
| 5 | Halftone Print | hero.jpg | `reports/showcase/showcase-001/derived-visuals/halftone_print-hero.png` |
| 6 | 1980s Airbrush | performance.jpg | `reports/showcase/showcase-001/derived-visuals/airbrush_1980s-performance.png` |
| 7 | Television Scanline | hero.jpg | `reports/showcase/showcase-001/derived-visuals/television_scanline-hero.png` |
| 8 | Minimal Ink | close-up.jpg | `reports/showcase/showcase-001/derived-visuals/minimal_ink-close-up.png` |
| 9 | Vintage Editorial | alternate.jpg | `reports/showcase/showcase-001/derived-visuals/vintage_editorial-alternate.png` |
| 10 | Graphic Novel | crowd.jpg | `reports/showcase/showcase-001/derived-visuals/graphic_novel-crowd.png` |

## Generation notes

- Prompts built via `buildDerivedVisualPrompt()` — same engine as Derived Visual Studio 2.7
- Each prompt preserves performer identity, stage lighting, and composition
- PNG files generated from source performance frames (showcase-only; production hook unchanged)
- Recommended full-screen pairings: Television Scanline + hero, Minimal Ink + close-up, Concert Poster + alternate
