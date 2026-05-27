# Archive Permanence Pass

Permanence refinement — institutional endurance without decorative aging or new UI systems.

## Permanence findings

| Issue | Fix |
|-------|-----|
| Short sparse pages floated above footer | Flex column + `margin-top: auto` on footer |
| Loading track lacked footer | Same institutional footer (Home · Search) |
| Inconsistent mount shadows | Shared `--exhibit-mount` on frames/lists/chart |
| Sections felt stacked without register | Top ink rule + padding between major blocks |
| Sparse hero felt “in progress” | Centered hold + bottom register before footer |
| Link hover transitions | `transition: none` on exhibit anchors |

## Structural stability

- `min-height: 100dvh` flex shell on track + artist exhibits
- Footer as permanent base register with subtle top edge
- 52rem column (weight pass) retained

## Healed vs degraded endurance

| | Sparse / loading | Healed |
|--|------------------|--------|
| Shell | Flex-held hero, footer anchored | Same structure + filed sections |
| Feel | **Held in the archive** | Restored fullness, same institution |

## Typography / material

- File tags **800** · section links **600** (not CTA-bold)
- Chart rank **800** (consistent institutional numerals)
- Artist name letter-spacing tightened for endurance
- Unified matte mount shadow (not glossy card stack)

## Files

- `app/exhibit-permanence.css`
- `app/track/[id]/loading.tsx` — footer on loading shell
- Prior: `PUBLIC_ARCHIVE_WEIGHT.md`, `PUBLIC_ARCHIVE_PATINA.md`
