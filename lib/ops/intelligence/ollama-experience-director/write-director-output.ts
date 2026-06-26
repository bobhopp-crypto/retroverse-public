import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";

import { retroverseDataRoot } from "@/lib/retroverse-data-root";

import type { DirectorRunResult, DirectorSongOutput, PilotSelection } from "./types";

export function directorPilotReportsDir(): string {
  return join(process.cwd(), "reports", "experience-director-pilot");
}

export function directorPilotOutputDir(): string {
  return join(retroverseDataRoot(), "ops", "intelligence", "director-pilot");
}

export function bundledDirectorPilotOutputDir(): string {
  return join(process.cwd(), "data", "ops", "intelligence", "director-pilot");
}

export function directorPilotOutputPath(rvtr: string): string {
  return join(directorPilotOutputDir(), `${rvtr.trim().toUpperCase()}.json`);
}

export function bundledDirectorPilotOutputPath(rvtr: string): string {
  return join(bundledDirectorPilotOutputDir(), `${rvtr.trim().toUpperCase()}.json`);
}

export async function writeSelectedSongs(selection: PilotSelection): Promise<string> {
  const dir = directorPilotReportsDir();
  await mkdir(dir, { recursive: true });
  const path = join(dir, "selected-songs.json");
  await writeFile(path, `${JSON.stringify(selection, null, 2)}\n`, "utf8");
  return path;
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Write per-song director JSON to data roots. */
export async function writeDirectorOutputs(outputs: DirectorSongOutput[]): Promise<string[]> {
  const paths: string[] = [];
  for (const output of outputs) {
    const rvtr = output.rvtr.toUpperCase();
    const dataPath = directorPilotOutputPath(rvtr);
    const bundledPath = bundledDirectorPilotOutputPath(rvtr);
    await writeJson(dataPath, output);
    await writeJson(bundledPath, output);
    paths.push(bundledPath);
  }
  return paths;
}

function readinessEmoji(readiness: string): string {
  switch (readiness) {
    case "ready":
      return "✅";
    case "needs_more_research":
      return "⚠️";
    default:
      return "❌";
  }
}

function publicSuitability(output: DirectorSongOutput): string {
  if (output.publicReadiness === "ready" && output.chapters.length >= 1) {
    return "Suitable for public display";
  }
  if (output.publicReadiness === "needs_more_research") {
    return "Promising — needs more research before public";
  }
  return "Not suitable for public display yet";
}

/** Write combined PILOT-REPORT.md. */
export async function writePilotReport(
  selection: PilotSelection,
  results: DirectorRunResult[],
): Promise<string> {
  const dir = directorPilotReportsDir();
  await mkdir(dir, { recursive: true });
  const path = join(dir, "PILOT-REPORT.md");

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  const lines: string[] = [
    "# Experience Director Pilot Report",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Songs selected:** ${selection.count}`,
    `**Director runs:** ${okCount} ok, ${failCount} failed`,
    "",
    "## Selected Songs",
    "",
    "| # | Title | Artist | RVTR | Play Count | Package Tier | Readiness |",
    "|--:|-------|--------|------|----------:|--------------|-----------|",
  ];

  results.forEach((result, i) => {
    const song = selection.songs.find((s) => s.rvtr === result.rvtr);
    const out = result.output;
    const readiness = out?.publicReadiness ?? (result.ok ? "?" : "error");
    lines.push(
      `| ${i + 1} | ${song?.title ?? "?"} | ${song?.artist ?? "?"} | ${result.rvtr} | ${song?.playCount ?? 0} | ${song?.packageQualityTier ?? "?"} | ${readinessEmoji(readiness)} ${readiness} |`,
    );
  });

  lines.push("", "## Per-Song Summary", "");

  for (const result of results) {
    const song = selection.songs.find((s) => s.rvtr === result.rvtr);
    lines.push(`### ${song?.title ?? result.rvtr} — ${song?.artist ?? ""}`);
    lines.push("");

    if (!result.ok || !result.output) {
      lines.push(`**Status:** FAILED — ${result.error ?? "unknown error"}`);
      lines.push("");
      continue;
    }

    const out = result.output;
    lines.push(`**Readiness:** ${readinessEmoji(out.publicReadiness)} ${out.publicReadiness}`);
    lines.push(`**Public suitability:** ${publicSuitability(out)}`);
    lines.push(`**Best angle:** ${out.bestAngle || "(none)"}`);
    lines.push(`**Hero note:** ${out.heroNote || "(none)"}`);
    lines.push("");

    if (out.chapters.length > 0) {
      lines.push("**Proposed chapters:**");
      for (const ch of out.chapters) {
        lines.push(`- [${ch.type}] **${ch.title}** — ${ch.whyIncluded || ch.body.slice(0, 120)}`);
      }
      lines.push("");
    }

    if (out.omitReasons.length > 0) {
      lines.push("**Omitted content:**");
      for (const r of out.omitReasons) lines.push(`- ${r}`);
      lines.push("");
    }

    if (out.doNotShow.length > 0) {
      lines.push("**Do not show:**");
      for (const r of out.doNotShow) lines.push(`- ${r}`);
      lines.push("");
    }

    const suspicious = out.qualityNotes.filter(
      (n) => /suspicious|wrong|unverified|doubt|flag/i.test(n),
    );
    if (suspicious.length > 0) {
      lines.push("**Suspicious facts flagged:**");
      for (const n of suspicious) lines.push(`- ${n}`);
      lines.push("");
    } else if (out.qualityNotes.length > 0) {
      lines.push("**Quality notes:**");
      for (const n of out.qualityNotes) lines.push(`- ${n}`);
      lines.push("");
    }

    if (out.missingData.length > 0) {
      lines.push("**Missing data:**");
      for (const m of out.missingData) lines.push(`- ${m}`);
      lines.push("");
    }

    if (out.recommendedNextResearch.length > 0) {
      lines.push("**Recommended next research:**");
      for (const r of out.recommendedNextResearch) lines.push(`- ${r}`);
      lines.push("");
    }

    if (out.discoveryShelves.length > 0) {
      lines.push("**Discovery shelves:**");
      for (const shelf of out.discoveryShelves) {
        lines.push(`- **${shelf.title}** (${shelf.items.length} items): ${shelf.whyThisShelfMatters}`);
      }
      lines.push("");
    }
  }

  lines.push("## Outputs", "");
  lines.push("- `reports/experience-director-pilot/selected-songs.json`");
  lines.push("- `data/ops/intelligence/director-pilot/{RVTR}.json`");
  lines.push("- Review at `/ops/experience-director-pilot`");
  lines.push("");

  await writeFile(path, `${lines.join("\n")}\n`, "utf8");
  return path;
}
