# RVBR 2.0 — Illustration vs Pass Composition

> **⛔ SUPERSEDED — REVERTED (July 1, 2026).** This architecture was tried and rolled back in
> commit `ba9da7daa` ("Pass Production v1: restore finished-AI pass artwork, keep QR/serial
> overlay"). The Composer approach (AI illustrates only; BobOS overlays typography, bands,
> badges) produced lower-quality artwork than the finished-artwork model. The files listed in
> the File Map below (`lib/creative/rvbr/*`, `lib/bobos/project-zero/pass-overlay.ts`) no
> longer exist. **Current behavior:** the AI generates the complete collectible design via
> `composeRvbrPrompt` (`lib/creative/rvbr-prompt-engine.ts`); BobOS composites only the QR
> code and serial stamp (`lib/bobos/project-zero/pass-production.ts`). Do not re-implement
> this document.

Retroverse Brand Rules (RVBR) 2.0 separates **illustration** from **pass design**.

AI is the illustrator. BobOS is the designer. The image model never creates finished passes.

---

## Three Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1 — Creative Director (AI prompt)                    │
│  Era · mood · venue atmosphere · palette · materials        │
│  Energy · lighting · visual language · composition direction  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 2 — Illustrator (AI prompt)                          │
│  Backgrounds · frames · textures · lighting · illustration  │
│  NO text · NO QR · NO serial · NO fake labels               │
└──────────────────────────┬──────────────────────────────────┘
                           │  raw PNG (1024×1536)
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 3 — BobOS Composer (deterministic, not in AI prompt) │
│  Event title · venue · date · pass type · QR · serial · seal│
└─────────────────────────────────────────────────────────────┘
                           │
                     finished pass PNG
                     (Preview = Print)
```

---

## Layer 1 — Creative Director

**Module:** `lib/creative/rvbr/creative-director.ts`

Responsible for creative direction only:

- RVBR era profile (palette, motifs, references, anti-cliché)
- Event atmosphere (venue, series, theme, schedule as **mood** — never as typography for passes)
- Physical artifact feel (collectible credential stock, laminate, foil)
- Composition direction (festival pass, collector card, backstage credential, etc.)
- Retroverse brand craftsmanship rules

**Output:** A brief the Illustrator must follow. No production text instructions for pass artifacts.

---

## Layer 2 — Illustrator

**Module:** `lib/creative/rvbr/illustrator.ts`

Responsible **only** for decorative artwork:

| May illustrate | Must not illustrate |
|----------------|---------------------|
| Backgrounds, frames, borders | Event titles, venue names, dates |
| Textures, paper stock, foil feel | Pass type labels, serial numbers |
| Lighting, atmosphere, era mood | QR codes, barcodes, fake stamps |
| Decorative objects, graphic composition | Any readable words or numerals |
| Production reserve zones (empty) | White form-field boxes |

Quality mandate emphasizes:

- Premium trading-card / museum-quality collectible art
- Screen-printed poster and offset printing feel
- High contrast, vibrant inks, clean composition
- **Not** generic AI poster, conference badge, template, or marketing flyer

For `artifactType === "pass"`, the no-text policy is absolute. Collector cards and other artifact types may still use governed typography where appropriate.

---

## Layer 3 — BobOS Composer

**Reference:** `lib/creative/rvbr/composer-reference.ts`  
**Implementation:** `lib/bobos/project-zero/pass-overlay.ts`, `lib/bobos/project-zero/pass-production.ts`

This layer is **never sent to the image model**. BobOS deterministically composites:

- Pass type badge (General / VIP / Backstage)
- Venue and series (front)
- Theme and schedule (back header)
- QR code (reserved zone)
- Distressed serial stamp
- Retroverse authenticity seal

Preview and print sheets use the same finished PNG — no CSS text overlay in production.

---

## Asset Library (groundwork)

**Module:** `lib/creative/rvbr/asset-library.ts`

Long-term goal: curate Retroverse-specific building blocks instead of relying entirely on AI invention.

Categories defined (empty registry today):

`frame` · `border` · `texture` · `lighting` · `music-motif` · `stage-equipment` · `speaker` · `vinyl` · `palm-tree` · `neon-accent` · `tour-case` · `crowd-silhouette` · `lighting-rig` · `confetti` · `ticket-tear` · `paper-stock`

Each asset entry supports:

- Stable `id` and `category`
- Curator `description` and optional `promptHint`
- Optional `eraSlugs` filter
- Future `assetPath` for composited PNG/SVG
- `curated` flag (prompt-hint only vs production-ready)

`pickRvbrAssets()` selects deterministically by composition seed. The Illustrator layer injects hints when assets exist.

---

## Orchestration

**Entry point:** `lib/creative/rvbr-prompt-engine.ts` → `composeRvbrPrompt()`

1. Builds Creative Director brief
2. Builds Illustrator brief (includes asset hints + production reserves on back)
3. Assembles final prompt (`assembleIllustrationPrompt`) — **Composer excluded**
4. Returns debug breakdown with all three layers for Prompt Inspector

**BobOS Pass Workspace** calls this via `runVNextGenerate({ artifact: "pass" })` — unchanged workflow; only prompt architecture improved.

---

## What This Sprint Did Not Change

- Pass Workspace UI
- Batch generation, print sheets, QR, serial numbering
- Preview system
- Project Zero, Event Studio
- Poster / homepage pipelines

---

## Regenerating Artwork

Passes generated **before** RVBR 2.0 may still contain baked-in AI text in the raw PNG. Regenerate artwork per pass type in the Pass Workspace to get clean illustration-only backgrounds.

---

## File Map

| File | Role |
|------|------|
| `lib/creative/rvbr/creative-director.ts` | Layer 1 |
| `lib/creative/rvbr/illustrator.ts` | Layer 2 |
| `lib/creative/rvbr/composer-reference.ts` | Layer 3 reference |
| `lib/creative/rvbr/asset-library.ts` | Curated asset registry (empty starter) |
| `lib/creative/rvbr/index.ts` | Public exports |
| `lib/creative/rvbr-prompt-engine.ts` | Orchestrator |
| `lib/bobos/project-zero/pass-overlay.ts` | Composer SVG overlays |
| `lib/bobos/project-zero/pass-production.ts` | Composer sharp pipeline |
