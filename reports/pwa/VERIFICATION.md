# Retroverse Live PWA — verification

Date: 2026-07-20  
Target: `apps/live` (retroverse.live)

## Automated checks (local `next dev :3015`)

| Check | Result |
|-------|--------|
| Manifest `display: standalone` | PASS |
| `theme_color` / `background_color` `#050814` | PASS |
| Maskable + any icons | PASS |
| `/sw.js`, `/offline.html`, icon assets 200 | PASS |
| Apple capable + status bar `black-translucent` | PASS |
| Install card copy present when not dismissed | PASS |
| Lighthouse **best-practices** score | **1.0** |
| Lighthouse PWA category | N/A — removed in Lighthouse 13; used functional checks above |

Easy warning left as-is: `valid-source-maps` on Next dev chunks (production build maps differ; not chased).

## Device checklist

| Criterion | Status |
|-----------|--------|
| Install works | Ready — Add to Home Screen / Chrome Install |
| Launches standalone | Ready — `display: standalone` + Apple capable |
| Icons correct | Placeholders shipped (see `public/icons/ICONS.md`) |
| Offline page works | Ready — SW navigation fallback → `/offline.html` |
| No browser chrome | Ready — standalone + Apple web app meta |

## Splash / safe areas

- Theme / splash / Apple status bar: `#050814` + `black-translucent`
- Global nav: `env(safe-area-inset-top)` (Dynamic Island)
- Live bottom chrome + install card: `env(safe-area-inset-bottom)` (Home Indicator)
- Offline page: all four safe-area insets

## Manual smoke (production)

1. Deploy live app  
2. iPhone Safari → Share → Add to Home Screen → launch (no Safari chrome)  
3. Airplane mode → open installed app or navigate → offline page + Try again  
4. Fresh browser profile → install card appears once; dismiss → does not return  
