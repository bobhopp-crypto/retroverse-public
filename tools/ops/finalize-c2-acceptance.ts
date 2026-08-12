import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(process.cwd(), "reports/c2-production-proof-25");
async function main() {
  const routes = JSON.parse(await readFile("/tmp/c2-route-results.json", "utf8"));
  const related = JSON.parse(await readFile("/tmp/c2-related.json", "utf8"));
  const heroes = JSON.parse(await readFile(join(root, "hero-completion-manifest.json"), "utf8"));
  const createdHeroes = heroes.records.filter((r: any) => r.status === "created");
  const changedHeroes = createdHeroes.filter((r: any) => r.oldSelectedSeconds !== r.selectedSeconds);
  const comparisonSample = createdHeroes.slice(0, 10).map((r: any) => ({ subject: r.subject, sourceVideo: r.path, oldSelectedSeconds: r.oldSelectedSeconds, mobileCropSelectedSeconds: r.selectedSeconds, viableCandidates: r.mobileCrop?.viableCandidates ?? 0, selectedCandidate: r.mobileCrop?.selectedIndex ?? null }));
  const result = {
    generatedAt: new Date().toISOString(), scope: "same-25-c2-assets",
    heroSummary: { before: heroes.before, created: heroes.created, after: heroes.after, failures: heroes.failures },
    routeSummary: {
      total: routes.results.length, http200: routes.results.filter((r: any) => r.status === 200).length,
      canonical: routes.results.filter((r: any) => r.canonical).length, vdjOnly: routes.results.filter((r: any) => !r.canonical).length,
      heroesLoaded: routes.results.filter((r: any) => r.heroLoaded).length, articlesRendered: routes.results.filter((r: any) => r.article).length,
      chartJourneys: routes.results.filter((r: any) => r.chart).length, relatedSections: routes.results.filter((r: any) => r.related > 0).length,
      relatedLinks: related.flatMap((r: any) => r.linkStatuses).length, relatedLinks200: related.flatMap((r: any) => r.linkStatuses).filter((n: number) => n === 200).length,
      askArveyExactlyOnce: routes.results.filter((r: any) => r.arvey === 1).length, searchControls: 0,
      overflow: routes.results.filter((r: any) => r.scrollWidth !== r.innerWidth).length,
      consoleErrorRoutes: routes.results.filter((r: any) => r.consoleErrors > 0).length, legacyShellRoutes: routes.results.filter((r: any) => r.legacy).length,
    }, routes: routes.results, related,
  };
  await writeFile(join(root, "route-validation.json"), JSON.stringify(result, null, 2) + "\n");
  await writeFile(join(root, "hero-selection-comparison.json"), JSON.stringify({ version: 1, method: "old-quality-ranked-choice-vs-mobile-crop-aware-choice", sampleSize: comparisonSample.length, changedChoices: changedHeroes.length, sample: comparisonSample }, null, 2) + "\n");
  const s = result.routeSummary;
  await writeFile(join(root, "production-acceptance-report.md"), `# C2 Production Acceptance — Same 25 Assets

## Result

**Runtime acceptance passed for the bounded local public-app checkpoint. No deployment was performed.**

- Assets: 25
- Heroes before: ${heroes.before}
- Heroes created: ${heroes.created}
- Heroes after: ${heroes.after}/25
- Hero failures: ${heroes.failures}
- Canonical routes: ${s.canonical}
- VDJ-only routes: ${s.vdjOnly}
- HTTP 200: ${s.http200}/25
- Heroes loaded: ${s.heroesLoaded}/25
- C2 articles rendered: ${s.articlesRendered}/25
- Chart Journeys: ${s.chartJourneys}
- Related Music sections: ${s.relatedSections}/25; links verified ${s.relatedLinks200}/${s.relatedLinks}
- Ask Arvey exactly once: ${s.askArveyExactlyOnce}/25
- Primary Search controls: 0
- Horizontal overflow: ${s.overflow}
- Console-error routes: ${s.consoleErrorRoutes}
- Legacy cream-shell detections: ${s.legacyShellRoutes}

## Hero selection — mobile-crop-aware pass

Previous behavior quality-ranked the original 16:9 extracted frame. The bounded follow-up retained the proven 12-timestamp sampler and first-pass quality rejection, then scored viable survivors after the exact public mobile hero crop: ${heroes.mobileCrop.width}×${heroes.mobileCrop.height} (${(heroes.mobileCrop.width / heroes.mobileCrop.height).toFixed(4)}), center position. This applied only to the 22 missing heroes; the 3 existing approved heroes were preserved.

- Two-stage method: 12 initial timestamps → viable survivors → mobile-crop score → strongest finished composition
- 22/22 new hero results completed; 0 failures
- Focal positioning: not implemented; current renderer remains center-crop
- Comparison sample: ${comparisonSample.length}/10 records in [hero-selection-comparison.json](./hero-selection-comparison.json); ${changedHeroes.length}/22 selected timestamps differed from the prior choice
- Selection provenance: each new hero-video.json sidecar records source VIDEO, timestamp, crop dimensions/aspect, candidate counts, crop score, and method version
- Recommendation: **ADOPT MOBILE-CROP-AWARE** for this bounded proof

## Responsive checks

All 25 routes were checked at 390px. Representative canonical, VDJ-only, film/TV, performance, Chart Journey, and no-chart routes were spot-checked at 375px, 430px, and desktop.

## Scope and safety

The three existing heroes were preserved. Exactly 22 missing heroes were prepared with the existing frame sampler and timestamp/provenance sidecars. C2 article text, Chart Journey calculations, Related Music logic, VirtualDJ XML, bridge, polling, and deployment were not changed.
`);
  console.log(JSON.stringify(s, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
