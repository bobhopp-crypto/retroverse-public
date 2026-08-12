import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const root = join(process.cwd(), "reports/c2-production-batch-100");
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const decade = (r: any) => { const y = Number(r.displayYear ?? r.vdjYear ?? 0); return y > 0 ? Math.floor(y / 10) * 10 : 0; };
const context = (r: any) => /film|movie|soundtrack|ost|tv|television|live|concert|performance|show|session|mix|remix|extended|edit|version|karaoke|tribute/i.test([r.vdjArtist,r.vdjTitle,r.vdjAlbum,r.vdjGrouping,r.vdjRemix,r.vdjPath].map(norm).join(" ")) ? "performance/film/TV/remix context" : "ordinary song";
const vdjKey = (path: string) => createHash("sha256").update(norm(path)).digest("hex").slice(0, 16);

async function main() {
  const inventory = JSON.parse(await readFile(join(process.cwd(), "reports/vdj-library-coverage/inventory.json"), "utf8"));
  const completion = JSON.parse(await readFile(join(process.cwd(), "data/ops/manifest/video-completion-manifest.json"), "utf8"));
  const completionByPath = new Map(completion.records.map((r: any) => [norm(r.vdjPath), r]));
  const prior25 = JSON.parse(await readFile(join(process.cwd(), "reports/c2-production-proof-25/c2-editorial-manifest.json"), "utf8"));
  const prior5 = JSON.parse(await readFile(join(process.cwd(), "reports/open-research-editorial-5/control-c2-editorial.json"), "utf8"));
  const priorRows = [...prior25, ...prior5];
  const excluded = new Set(priorRows.map((r: any) => norm(r.vdjResearchBrief?.path ?? r.path ?? r.vdjPath)).filter(Boolean));
  const excludedSubjects = new Set(priorRows.map((r: any) => norm(r.subject ?? r.editorialSubject)).filter(Boolean));
  const candidates = inventory.records.filter((r: any) => {
    const subject = norm(`${r.vdjArtist} — ${r.vdjTitle}`);
    return r.fileExists !== false && String(r.vdjArtist ?? "").trim() && String(r.vdjTitle ?? "").trim() && !excluded.has(norm(r.vdjPath)) && !excluded.has(norm(r.physicalPath)) && !excludedSubjects.has(subject);
  });
  const buckets = new Map<string, any[]>();
  for (const r of candidates) { const b = `${decade(r)}|${context(r)}|${r.canonicalStatus === "resolved" ? "canonical" : "vdj-only"}|${r.chartJourneyStatus === "AVAILABLE" ? "chart" : "no-chart"}`; const list = buckets.get(b) ?? []; list.push(r); buckets.set(b, list); }
  for (const list of buckets.values()) list.sort((a, b) => Number(b.playCount ?? 0) - Number(a.playCount ?? 0));
  const selected: any[] = []; const seen = new Set<string>(); const names = [...buckets.keys()].sort((a, b) => (buckets.get(b)?.length ?? 0) - (buckets.get(a)?.length ?? 0));
  while (selected.length < 100) { let added = false; for (const name of names) { const r = buckets.get(name)?.shift(); if (!r) continue; const id = norm(r.physicalPath ?? r.vdjPath); if (seen.has(id)) continue; seen.add(id); selected.push(r); added = true; if (selected.length === 100) break; } if (!added) break; }
  if (selected.length !== 100) throw new Error(`Expected 100, found ${selected.length}`);
  const records = selected.map((r, i) => ({ batchIndex: i + 1, physicalPath: r.physicalPath ?? r.vdjPath, vdjPath: r.vdjPath, filename: basename(r.vdjPath), artist: r.vdjArtist, title: r.vdjTitle, remix: r.vdjRemix ?? null, grouping: r.vdjGrouping ?? null, album: r.vdjAlbum ?? null, vdjYear: r.vdjYear ?? null, displayYear: r.displayYear ?? null, displayYearSource: r.displayYearSource ?? null, rvtr: r.rvtr ?? null, videoExperienceId: completionByPath.get(norm(r.vdjPath))?.videoExperienceId ?? `VDJ:${vdjKey(r.vdjPath)}`, canonicalStatus: r.canonicalStatus, chartJourneyStatus: r.chartJourneyStatus, heroStatus: r.heroStatus, storyStatus: r.storyStatus, playCount: r.playCount ?? 0, context: context(r), selectionReason: "fresh owned VIDEO; stratified by era/context/identity/chart state" }));
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "selection-manifest.json"), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), requested: 100, selected: records.length, excludedPriorC2Assets: excluded.size, records }, null, 2) + "\n");
  const count = (fn: (r: any) => boolean) => records.filter(fn).length;
  const lines = ["# C2 Production Batch — 100 Asset Selection", "", `Exactly **${records.length}** fresh existing owned VIDEO files selected. Prior C2 exclusions: ${excluded.size}.`, "", "## Mix", "", `- Canonical-linked: ${count(r => r.canonicalStatus === "resolved")}`, `- VDJ-only/unresolved: ${count(r => r.canonicalStatus !== "resolved")}`, `- Chart Journey available: ${count(r => r.chartJourneyStatus === "AVAILABLE")}`, `- No Chart Journey: ${count(r => r.chartJourneyStatus !== "AVAILABLE")}`, `- Existing hero reused: ${count(r => r.heroStatus === "PREPARED_VIDEO_HERO")}`, `- Hero preparation required: ${count(r => r.heroStatus !== "PREPARED_VIDEO_HERO")}`, "", "## Records", "", "| # | Artist | Title | Year | Context | Identity | Chart | Hero | Path |", "|---:|---|---|---:|---|---|---|---|---|", ...records.map(r => `| ${r.batchIndex} | ${r.artist} | ${r.title} | ${r.vdjYear ?? "—"} | ${r.context} | ${r.canonicalStatus} | ${r.chartJourneyStatus} | ${r.heroStatus} | ${r.vdjPath} |`)];
  await writeFile(join(root, "selection-report.md"), lines.join("\n") + "\n");
  console.log(JSON.stringify({ selected: records.length, excluded: excluded.size, canonical: count(r => r.canonicalStatus === "resolved"), vdjOnly: count(r => r.canonicalStatus !== "resolved"), chart: count(r => r.chartJourneyStatus === "AVAILABLE"), noChart: count(r => r.chartJourneyStatus !== "AVAILABLE") }, null, 2));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
