# Sprint 3.0 — Experience Review (Swipe-Faster Audit)

**Song:** Phil Collins — In The Air Tonight · `RVTR417030`  
**Route:** `/experience/RVTR417030`

Patron lens: where would you swipe faster, and why?

---

## Before polish

| # | Moment | Why swipe faster |
|---|--------|------------------|
| 3, 5, 14 | Timeline "1981" | No image. Headline is only a year. Copy repeats previous scene headline. Dead air. |
| 7 + 11 | Chart Milestone ×2 | Same #19 fact twice. Feels like the app stuttered. |
| 8 | Visual Break | Same headline as scene 6 ("Commercial success"). No new idea. |
| 9 | Cultural impact | Wikipedia opener + collector dump. Reads like a report, not a companion. |
| 13 | last chart fact | ~49 words. Encyclopedia hook stacked on chart close. Weakest close. |
| Most scenes | Same two frames | Hero + performance recycled; close-up/alternate/crowd ignored. |
| All scenes | Same layout | Image-on-top, copy-below, every time. Monotonous rhythm. |

---

## After polish (Sprint 3.0)

| Change | Effect |
|--------|--------|
| Prune imageless timeline beats | Removes 3 empty "1981" screens |
| Dedupe chart milestones | One chart beat, not two |
| Sanitize encyclopedia copy | Strips "is a song by…" openers; caps word count |
| Demote text-heavy quotes | Cultural impact → visual break or minimal chart |
| Rotate frame pool | Adjacent scenes use different extracted frames |
| Layout rhythm | fullscreen → image+quote → minimal fact → chart → performance |
| CSS treatment cycle | scanline / monochrome / halftone / poster variation without new assets |
| Typography | Shorter line length (38ch body), tighter mobile sizing |

---

## Strongest moments (unchanged)

1. **Hero opening** — performance-forward, minimal copy, strong frame  
2. **Performance spotlight** with distinct angle after image rotation  
3. **Full-screen visual breaks** — pause without reading

---

## Remaining gaps (future, not this sprint)

- No dedicated Face Value / drum-fill visual (needs new frame extraction, not AI)
- Chart beat still text-forward without designed #19 graphic
- 2016 compilation fact still in director data (editorial, not renderer)

---

## Success test

A first-time viewer should feel **curated television companion**, not **generated Wikipedia slideshow**.

Open `/experience/RVTR417030` and swipe through once. Count screens where you hesitate vs. skim.

**Target after polish:** 10 composed moments, ≤10 avg words/scene, 0 adjacent duplicate images.

**Measured (validation run):** 10 scenes · 10 avg words · 0 adjacent same image · 4 layout variants · 5 treatments.
