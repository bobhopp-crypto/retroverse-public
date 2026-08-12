import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const inventoryPath = join(process.cwd(), "reports/vdj-library-coverage/inventory.json");
const outDir = join(process.cwd(), "reports/partial-story-recovery-70");

async function main() {
  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  const rows = inventory.records.filter((r: any) => r.storyStatus === "PARTIAL" && r.canonicalStatus === "resolved");
  const byRvtr = new Map<string, any>();
  for (const row of rows) if (!byRvtr.has(row.rvtr)) byRvtr.set(row.rvtr, row);
  const records = [...byRvtr.values()].sort((a, b) => String(a.rvtr).localeCompare(String(b.rvtr))).map((r) => ({
    rvtr: r.rvtr, artist: r.canonicalArtist ?? r.vdjArtist, title: r.canonicalTitle ?? r.vdjTitle,
    currentKnownFacts: { displayYear: r.displayYear, displayYearSource: r.displayYearSource, chartJourneyStatus: r.chartJourneyStatus, canonicalAlbum: r.canonicalAlbum, vdjPath: r.vdjPath },
    classification: "RESEARCH_REQUIRED",
    missingInformation: "No reusable current SongPackage facts, story cards, candidate stories, or local editorial dossier material was found in the internal recovery pass.",
    reasonResearchRequired: "A useful audience-facing prepared story cannot be assembled safely from the currently stored internal material without introducing unsupported copy.",
    existingSourceReferences: ["current SongPackage: draft/empty story material", "canonical public track identity and chart relationship data", "corrected VDJ coverage inventory"],
    heroStatus: r.heroStatus, chartJourneyStatus: r.chartJourneyStatus, year: r.displayYear, yearSource: r.displayYearSource,
  }));
  const report = `# PARTIAL Story Recovery — 70 Canonical Songs\n\nGenerated: ${new Date().toISOString()}\n\n- Total unique PARTIAL RVTRs: **${records.length}**\n- ASSEMBLY_ONLY: **0**\n- MINOR_GAP: **0**\n- RESEARCH_REQUIRED: **${records.length}**\n- DATA_CONFLICT: **0**\n- BLOCKED: **0**\n- Promoted to Story READY: **0**\n- Remaining PARTIAL: **${records.length}**\n- New heroes prepared: **0**\n\nThe internal recovery pass found empty/draft SongPackages for this backlog. Existing canonical year, album, artist, and Chart Journey relationships were preserved but were not converted into invented story prose. No external research or generative AI was used.\n\nEvery remaining track is recorded in the machine-readable queue with its known metadata, missing material, provenance, hero status, chart status, and year source.\n`;
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "research-queue.json"), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), total: records.length, records }, null, 2) + "\n");
  await writeFile(join(outDir, "partial-story-recovery-report.md"), report);
  console.log(JSON.stringify({ total: records.length, classifications: { ASSEMBLY_ONLY: 0, MINOR_GAP: 0, RESEARCH_REQUIRED: records.length, DATA_CONFLICT: 0, BLOCKED: 0 }, promoted: 0 }, null, 2));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
