#!/usr/bin/env npx tsx
/**
 * Read-only migration inventory before DK label changes.
 * Output: reports/dk-retirement/MIGRATION-REPORT.md + migration-stats.json
 */
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import { basename, join } from "path";

import { loadDeckIndex } from "../../lib/ops/intelligence/deck-index.ts";
import { isSongExperienceRenderable } from "../../lib/ops/intelligence/song-experience-renderability.ts";
import { songPackagesDir } from "../../lib/ops/intelligence/paths.ts";
import { normVdjPath, vdjDatabasePath } from "../../lib/ops/intelligence/vdj-database.ts";

const RVTR_RE = /RVTR\d{6}/i;
const OUT_DIR = join(process.cwd(), "reports", "dk-retirement");

type PackageRow = { rvtr: string; status: string };

function rvtrFromLabel(label: string): string | null {
  return label.match(RVTR_RE)?.[0]?.toUpperCase() ?? null;
}

function labelKind(label: string): "DK" | "PK" | "RVTR" | "OTHER" {
  const trimmed = label.trim();
  if (trimmed.startsWith("DK_")) return "DK";
  if (trimmed.startsWith("PK_")) return "PK";
  if (/^RVTR\d{6}$/i.test(trimmed)) return "RVTR";
  return "OTHER";
}

async function loadPackages(): Promise<Map<string, PackageRow>> {
  const out = new Map<string, PackageRow>();
  try {
    for (const file of await readdir(songPackagesDir())) {
      if (!/^RVTR\d{6}\.json$/i.test(file)) continue;
      try {
        const raw = await readFile(join(songPackagesDir(), file), "utf8");
        const parsed = JSON.parse(raw) as { rvtr?: string; status?: string };
        const rvtr = (parsed.rvtr ?? basename(file, ".json")).trim().toUpperCase();
        if (!/^RVTR\d{6}$/.test(rvtr)) continue;
        out.set(rvtr, { rvtr, status: parsed.status ?? "draft" });
      } catch {
        // skip malformed
      }
    }
  } catch {
    // no packages dir
  }
  return out;
}

async function scanVdjLabels() {
  const xml = await readFile(vdjDatabasePath(), "utf8");
  const fileRows = { dk: 0, pk: 0, rvtr: 0, other: 0, blank: 0, videoDk: 0, videoPk: 0 };
  const dkRvtrs = new Set<string>();
  const pkRvtrs = new Set<string>();
  const rvtrOnly = new Set<string>();

  for (const match of xml.matchAll(/<Song\s+FilePath="([^"]*)"[^>]*>([\s\S]*?)<\/Song>/g)) {
    const filePath = match[1]?.replace(/\\/g, "/") ?? "";
    const inner = match[2] ?? "";
    const labelMatch = inner.match(/<Tags\b[^>]*\sLabel="([^"]*)"/);
    const label = labelMatch?.[1] ?? "";
    const rvtr = rvtrFromLabel(label);
    const kind = labelKind(label);
    const isVideo = /\/VIDEO\//i.test(filePath) && !/\/VIDEO VAULT\//i.test(filePath);

    if (!label.trim()) fileRows.blank += 1;
    else if (kind === "DK") {
      fileRows.dk += 1;
      if (isVideo) fileRows.videoDk += 1;
      if (rvtr) dkRvtrs.add(rvtr);
    } else if (kind === "PK") {
      fileRows.pk += 1;
      if (isVideo) fileRows.videoPk += 1;
      if (rvtr) pkRvtrs.add(rvtr);
    } else if (kind === "RVTR") {
      fileRows.rvtr += 1;
      if (rvtr) rvtrOnly.add(rvtr);
    } else fileRows.other += 1;
  }

  return { fileRows, dkRvtrs, pkRvtrs, rvtrOnly };
}

async function main() {
  const [packages, deckIndex, vdj] = await Promise.all([
    loadPackages(),
    loadDeckIndex(),
    scanVdjLabels(),
  ]);

  const deckIndexRvtrs = new Set(deckIndex.decks.map((entry) => entry.rvtr));
  const dkNotInIndex = [...vdj.dkRvtrs].filter((rvtr) => !deckIndexRvtrs.has(rvtr));
  const indexNotDk = [...deckIndexRvtrs].filter((rvtr) => !vdj.dkRvtrs.has(rvtr));
  const pkOnlyRenderable = [...vdj.pkRvtrs].filter((rvtr) => {
    const pkg = packages.get(rvtr);
    return pkg && isSongExperienceRenderable(pkg.status);
  });
  const dkRenderable = [...vdj.dkRvtrs].filter((rvtr) => {
    const pkg = packages.get(rvtr);
    return pkg && isSongExperienceRenderable(pkg.status);
  });
  const dkNoPackage = [...vdj.dkRvtrs].filter((rvtr) => !packages.has(rvtr));
  const pkWithPackage = [...vdj.pkRvtrs].filter((rvtr) => packages.has(rvtr));

  const stats = {
    scannedAt: new Date().toISOString(),
    vdjFileLabels: vdj.fileRows,
    distinctRvtrs: {
      dk: vdj.dkRvtrs.size,
      pk: vdj.pkRvtrs.size,
      rvtrOnly: vdj.rvtrOnly.size,
    },
    deckIndexCount: deckIndexRvtrs.size,
    dkNotInDeckIndex: dkNotInIndex.length,
    deckIndexWithoutDkLabel: indexNotDk.length,
    packagesTotal: packages.size,
    dkWithRenderablePackage: dkRenderable.length,
    pkWithRenderablePackage: pkOnlyRenderable.length,
    dkWithoutPackage: dkNoPackage.length,
    pkWithPackage: pkWithPackage.length,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "migration-stats.json"), `${JSON.stringify(stats, null, 2)}\n`, "utf8");

  const md = `# DK Retirement — Migration Report (Pre-Relabel)

**Generated:** ${stats.scannedAt}  
**Read-only inventory** — no label changes applied.

---

## VDJ label counts

| Scope | DK files | PK files | Bare RVTR | Blank | VIDEO DK | VIDEO PK |
|------:|---------:|---------:|----------:|------:|---------:|---------:|
| File rows | ${vdj.fileRows.dk} | ${vdj.fileRows.pk} | ${vdj.fileRows.rvtr} | ${vdj.fileRows.blank} | ${vdj.fileRows.videoDk} | ${vdj.fileRows.videoPk} |

| Distinct RVTR | Count |
|---------------|------:|
| DK RVTR | ${stats.distinctRvtrs.dk} |
| PK RVTR | ${stats.distinctRvtrs.pk} |
| Bare RVTR only | ${stats.distinctRvtrs.rvtrOnly} |

---

## Deck-index vs DK label

| Signal | Count |
|--------|------:|
| \`deck-index.json\` entries | ${stats.deckIndexCount} |
| DK label but **not** in deck-index | ${stats.dkNotInDeckIndex} |
| In deck-index but **no** DK label | ${stats.deckIndexWithoutDkLabel} |

Deck-index is a legacy workflow registry only — not a content artifact.

---

## Package / Song Experience renderability

Renderable = package status \`published\` or \`review\` (same gate as Song Experience).

| Cohort | Count |
|--------|------:|
| DK RVTR with renderable package | ${stats.dkWithRenderablePackage} |
| PK RVTR with renderable package | ${stats.pkWithRenderablePackage} |
| DK RVTR with **no** package file | ${stats.dkWithoutPackage} |
| PK RVTR with any package | ${stats.pkWithPackage} |
| Total packages on disk | ${stats.packagesTotal} |

**Rendering parity:** Songs with renderable packages should present identically regardless of DK vs PK label once runtime deck checks are removed.

---

## Functionality still tied to DK (pre-code-change)

| Area | Dependency | Post-retirement replacement |
|------|------------|----------------------------|
| Browser Plus \`deckStatus\` | \`label.startsWith("DK_")\` | Package renderability |
| Label write-back | \`deck-index\` → emit \`DK_\` | Always \`PK_\` when package exists |
| Video factory deck-worker | Promotes to deck-index | **Frozen** — no new index entries |
| Live queue filter | \`hasDeck\` = deck-index membership | \`hasExperience\` = renderable package |
| Live shell actions | "Deck" link to \`/rvtr/.../deck\` | Song Experience href |
| Automation factory metrics | \`missingDeck\`, deck-worker logs | Package renderability backlog |

---

## Relabel recommendation (do not execute yet)

After all runtime dependencies above are removed:

| Option | When to use |
|--------|-------------|
| **A. Leave DK untouched** | Short-term; labels become cosmetic only |
| **B. Convert DK → PK** | **Recommended** once code ignores prefix; ${stats.distinctRvtrs.dk} distinct RVTRs; package content unchanged |
| **C. Convert DK → bare RVTR** | Only if package absent; ${stats.dkWithoutPackage} DK RVTRs have no package |

**Recommended path:** **B** for RVTRs with packages (${stats.dkWithRenderablePackage + (stats.distinctRvtrs.dk - stats.dkWithoutPackage - stats.dkWithRenderablePackage)} have package but may not be published yet). Bare RVTR for the ${stats.dkWithoutPackage} without package files.

Do **not** relabel until Browser Plus, label matcher, and live queue no longer read DK or deck-index for decisions.

---

## Artifacts preserved

All package JSON content (story cards, chart cards, artist facts, covers, timelines, related songs) is **unaffected** by DK retirement. Only label prefix and deck-index workflow signals are retired.

`;

  await writeFile(join(OUT_DIR, "MIGRATION-REPORT.md"), md, "utf8");
  console.log(`Wrote ${join(OUT_DIR, "MIGRATION-REPORT.md")}`);
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
