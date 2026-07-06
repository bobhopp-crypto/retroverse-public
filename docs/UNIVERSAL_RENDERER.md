# Universal Mobile Experience Renderer

**Route:** `/song/[rvtr]`  
**Demo index:** `/song`

The Universal Renderer replaces hardcoded song-specific pages with an automatic system that works for any RVTR. It reads a SongPackage from the bundled intelligence dataset and builds a swipeable mobile card sequence appropriate for the available data.

---

## Philosophy

VirtualDJ plays the song. Retroverse presents it.

This renderer does not know which song is playing in advance. It simply receives an RVTR, inspects whatever data exists, and builds the best possible experience — from a bare hero card up to a full editorial suite.

Portrait mobile only. No desktop optimization.

---

## Data Flow

```
/song/[rvtr]
  └─ loadUniversalPackage(rvtr)         (server, lib/universal-renderer/load-package.ts)
       └─ reads: data/ops/intelligence/packages/{RVTR}.json
       └─ calls: selectCards(pkg)       (lib/universal-renderer/select-cards.ts)
            └─ returns: RendererCard[]
  └─ <UniversalRenderer cards={...} />  (client, components/universal-renderer/)
```

---

## Card Levels

The renderer emits cards based on what's available:

| Level | Data required | Cards emitted |
|-------|--------------|---------------|
| 0 | artist + title | `hero` + `credits` |
| 1 | storyCards (confidence ≥ 0.65) | `story` cards (up to 4) |
| 1 | quote-category story | `quote` card |
| 2 | chartHistory or peakHot100 | `charts` card |
| 2 | albumTitle | `album` card |
| 3 | ≥ 2 meaningful timeline events | `timeline` card |
| 4 | leftover facts | `facts` card |
| 4 | playCount / peakHot100 / hasVdjMedia | `library_stats` card |

Cards with insufficient data are silently skipped. No empty cards are ever shown.

---

## Card Registry

Every card type is an independent component. Adding a new card type requires three steps:

**1. Add a type** in `lib/universal-renderer/card-types.ts`:

```ts
export type MyCard = {
  kind: "my_card";
  // your fields
};

// Add to RendererCard union:
export type RendererCard = ... | MyCard;
```

**2. Add selection logic** in `lib/universal-renderer/select-cards.ts`:

```ts
// Inside selectCards(), inspect pkg and push your card:
if (someCondition) {
  cards.push({ kind: "my_card", /* fields */ });
}
```

**3. Register a component** in `components/universal-renderer/UniversalRenderer.tsx`:

```tsx
import { MyCard } from "./cards/MyCard";

// In renderCard():
case "my_card": return <MyCard card={card} />;
```

That's all. No CMS, no editor, no config file.

---

## File Layout

```
lib/universal-renderer/
  card-types.ts          ← Discriminated union of all card types
  select-cards.ts        ← Inspects SongPackage → ordered RendererCard[]
  load-package.ts        ← Server loader: RVTR → UniversalPackagePayload

components/universal-renderer/
  UniversalRenderer.tsx  ← Client swipeable player + card registry
  universal-renderer.css ← Full visual system (cream/teal/orange)
  cards/
    HeroCard.tsx
    StoryCard.tsx
    QuoteCard.tsx
    ChartsCard.tsx
    AlbumCard.tsx
    TimelineCard.tsx
    FactsCard.tsx
    LibraryStatsCard.tsx
    CreditsCard.tsx

apps/live/app/song/
  page.tsx               ← Demo index (/song)
  [rvtr]/page.tsx        ← Universal renderer entry point
```

---

## Demo Packages

| Level | RVTR | Artist | Title |
|-------|------|--------|-------|
| Sparse | `RVTR037683` | Bad Company | Feel Like Makin Love |
| Medium | `RVTR573393` | The Bangles | Walk Like An Egyptian |
| Rich | `RVTR285085` | Paul Simon | You Can Call Me Al |

Visit `/song` for a linked demo index.

---

## Future Handcrafted Experiences

To inject custom editorial cards for a specific RVTR without rebuilding the renderer:

1. Add a new card type (e.g. `handcrafted_photo`).
2. In `select-cards.ts`, check for a side-loaded JSON file or hardcoded override for that RVTR before the standard card selection.
3. Insert custom cards at the desired position in the sequence.

The renderer does not need to change. All other songs keep working as before.

---

## What This Does Not Do

- Does not control VirtualDJ or know what song is currently playing.
- Does not replace the Broadcast system or the Pass experience.
- Does not introduce a CMS or editing UI.
- Does not generate pages at build time — all routes are `force-dynamic`.
