# C2 Production Acceptance — Same 25 Assets

## Result

**Runtime acceptance passed for the bounded local public-app checkpoint. No deployment was performed.**

- Assets: 25
- Heroes before: 3
- Heroes created: 22
- Heroes after: 25/25
- Hero failures: 0
- Canonical routes: 11
- VDJ-only routes: 14
- HTTP 200: 25/25
- Heroes loaded: 25/25
- C2 articles rendered: 25/25
- Chart Journeys: 10
- Related Music sections: 10/25; links verified 40/40
- Ask Arvey exactly once: 25/25
- Primary Search controls: 0
- Horizontal overflow: 0
- Console-error routes: 0
- Legacy cream-shell detections: 0

## Hero selection — mobile-crop-aware pass

Previous behavior quality-ranked the original 16:9 extracted frame. The bounded follow-up retained the proven 12-timestamp sampler and first-pass quality rejection, then scored viable survivors after the exact public mobile hero crop: 390×608 (0.6414), center position. This applied only to the 22 missing heroes; the 3 existing approved heroes were preserved.

- Two-stage method: 12 initial timestamps → viable survivors → mobile-crop score → strongest finished composition
- 22/22 new hero results completed; 0 failures
- Focal positioning: not implemented; current renderer remains center-crop
- Comparison sample: 10/10 records in [hero-selection-comparison.json](./hero-selection-comparison.json); 13/22 selected timestamps differed from the prior choice
- Selection provenance: each new hero-video.json sidecar records source VIDEO, timestamp, crop dimensions/aspect, candidate counts, crop score, and method version
- Recommendation: **ADOPT MOBILE-CROP-AWARE** for this bounded proof

## Responsive checks

All 25 routes were checked at 390px. Representative canonical, VDJ-only, film/TV, performance, Chart Journey, and no-chart routes were spot-checked at 375px, 430px, and desktop.

## Scope and safety

The three existing heroes were preserved. Exactly 22 missing heroes were prepared with the existing frame sampler and timestamp/provenance sidecars. C2 article text, Chart Journey calculations, Related Music logic, VirtualDJ XML, bridge, polling, and deployment were not changed.
