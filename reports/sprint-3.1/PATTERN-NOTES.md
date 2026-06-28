## Patterns That Worked

- **Five-room rhythm** — Identity (cover) → Performance (close-up) → Song DNA (watercolor) → Chart (fingerprint over soft frame) → Closing (alternate frame, poster treatment).
- **Zero adjacent duplicate imagery** — Cover, SVG, and distinct frame picks keep each swipe visually fresh.
- **Chart Journey retained** — Existing fingerprint visualization with `museumMinimal` (no eyebrow, summary, or timeline).
- **Song DNA as pure art** — Programmatic SVG from musical + palette fields; no metrics on screen.
- **Typography only on Identity** — Artist, title, optional showcase badge; all other rooms image-first.

## Gaps Before Scaling Beyond 20

- **Inventory ceiling** — Repo has **13** eligible packages; target was **20**. Need **7** more Collector runs (play count 10–20, video, 5 frames).
- **Strict play-count tier** — Only **6** songs match 10–20 plays; remainder use expanded 5–20 or unknown play count.
- **Chart DB dependency** — 4 pilot songs lack live trajectory weeks; peak-only fallback used where needed.
- **Song DNA** — Built on the fly for packages missing `song-dna.json` via existing Collector DNA pipeline.

## Recommendations

1. Run Collector on 7+ additional VDJ songs in the 10–20 play band before calling this a 20-song pilot.
2. Keep museum mode as a presentation layer — do not fork Director until the five-room arc is validated.
3. Prioritize songs with Hot 100 trajectory data for the Chart Journey room.
4. RVTR417030 remains the showcase reference (`/experience/RVTR417030`).