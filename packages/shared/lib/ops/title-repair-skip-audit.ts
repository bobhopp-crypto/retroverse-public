import "server-only";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import {
  buildFeatCorruptionRepairPlans,
  type FeatCorruptionRepairResult,
} from "./repair-feat-corruption";
import { FEAT_CORRUPTION_SQL, runGraphIntegrityAudit, type FeatCorruptionRow } from "./graph-integrity-audit";

export type SkipGroup =
  | "no_tracks_title_source"
  | "no_graph_song_exists"
  | "vdj_only_identity"
  | "corrupted_title_still_present"
  | "other";

export type SkipAuditRow = {
  rvtr: string;
  artist: string;
  identitySource: string;
  canonicalTitle: string;
  normalizedTitleKey: string;
  graphTitle: string | null;
  graphTrackId: number | null;
  hasPrimaryVersion: boolean;
  repairSkipReason: string;
  skipGroup: SkipGroup;
  skipGroupDetail: string;
  peakHot100: number | null;
};

export type SkipGroupSummary = {
  group: SkipGroup;
  label: string;
  count: number;
  examples: SkipAuditRow[];
};

export type TitleRepairSkipAudit = {
  scannedAt: string;
  totalSkipped: number;
  totalCorruptRemaining: number;
  repairSkipReasons: Record<string, number>;
  groups: SkipGroupSummary[];
  allSkipped: SkipAuditRow[];
};

const GROUP_LABELS: Record<SkipGroup, string> = {
  no_tracks_title_source: "No tracks.title source",
  no_graph_song_exists: "No graph song exists",
  vdj_only_identity: "VDJ-only identity",
  corrupted_title_still_present: "Corrupted title still present",
  other: "Other",
};

function isTokenizationCorruption(title: string): boolean {
  return /\bFeat\b/i.test(title) && !/\b(feat\.|featuring| ft | ft\.|\(ft| - feat)/i.test(title);
}

export function classifySkipGroup(input: {
  row: FeatCorruptionRow;
  repairSkipReason: string;
  graphTrackId: number | null;
  hasPrimaryVersion: boolean;
}): { group: SkipGroup; detail: string } {
  const { row, repairSkipReason, graphTrackId, hasPrimaryVersion } = input;
  const graph = row.graphTitle?.trim() || null;

  if (repairSkipReason === "graph_title_also_corrupt" || (graph && /\bFeat\b/i.test(graph))) {
    return {
      group: "corrupted_title_still_present",
      detail: "Primary graph tracks.title also contains Feat tokenization artifact",
    };
  }

  if (graphTrackId != null && !graph) {
    return {
      group: "no_tracks_title_source",
      detail: "Graph track row exists but tracks.title is null or empty",
    };
  }

  if (!hasPrimaryVersion || graphTrackId == null) {
    if (row.identitySource === "vdj") {
      return {
        group: "vdj_only_identity",
        detail: "VDJ identity with no primary graph track — local filename-derived title",
      };
    }
    return {
      group: "no_graph_song_exists",
      detail: "No primary canonical_track_versions link to a graph track",
    };
  }

  if (row.identitySource === "vdj") {
    return {
      group: "vdj_only_identity",
      detail: "VDJ-only row — canonical title from local ingest, not chart graph",
    };
  }

  if (repairSkipReason === "normalized_key_mismatch") {
    return {
      group: "other",
      detail: "Clean graph title fails normalized_title_key validation",
    };
  }

  if (repairSkipReason === "already_clean") {
    return {
      group: "other",
      detail: "Canonical title already matches graph title but still matches feat-corruption SQL",
    };
  }

  if (isTokenizationCorruption(row.canonicalTitle)) {
    return {
      group: "corrupted_title_still_present",
      detail: "Canonical title still shows ft/feat tokenization corruption",
    };
  }

  return {
    group: "other",
    detail: repairSkipReason || "unclassified",
  };
}

export async function runTitleRepairSkipAudit(): Promise<TitleRepairSkipAudit> {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error("Postgres unavailable");

  const graphAudit = await runGraphIntegrityAudit();
  const { skipped: repairSkipped } = buildFeatCorruptionRepairPlans(graphAudit.allCorruptRows);
  const skipByRvtr = new Map(repairSkipped.map((s) => [s.rvtr, s.reason]));

  const rvtrs = graphAudit.allCorruptRows.map((r) => r.rvtr);
  const linkRows = await inspectQuery<{
    rvtr: string;
    graph_track_id: number | null;
    has_primary_version: boolean;
    tracks_title: string | null;
  }>(
    `
    SELECT upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
           ct.graph_track_id,
           EXISTS (
             SELECT 1 FROM canonical_track_versions ctv
             WHERE ctv.canonical_track_id = ct.id AND ctv.is_primary IS TRUE
           ) AS has_primary_version,
           t.title AS tracks_title
    FROM canonical_track_display ctd
    JOIN canonical_tracks ct ON ct.id = ctd.id
    LEFT JOIN canonical_track_versions ctv ON ctv.canonical_track_id = ct.id AND ctv.is_primary IS TRUE
    LEFT JOIN tracks t ON t.id = coalesce(ctv.graph_track_id, ct.graph_track_id)
    WHERE upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) = ANY($1::text[])
    `,
    [rvtrs],
  );
  const linkByRvtr = new Map(linkRows.map((r) => [r.rvtr, r]));

  const allSkipped: SkipAuditRow[] = graphAudit.allCorruptRows.map((row) => {
    const link = linkByRvtr.get(row.rvtr);
    const repairSkipReason = skipByRvtr.get(row.rvtr) ?? "not_skipped";
    const graphTitle = row.graphTitle?.trim() || link?.tracks_title?.trim() || null;
    const enrichedRow: FeatCorruptionRow = { ...row, graphTitle };

    const { group, detail } = classifySkipGroup({
      row: enrichedRow,
      repairSkipReason,
      graphTrackId: link?.graph_track_id ?? null,
      hasPrimaryVersion: link?.has_primary_version ?? false,
    });

    return {
      rvtr: row.rvtr,
      artist: row.artist,
      identitySource: row.identitySource,
      canonicalTitle: row.canonicalTitle,
      normalizedTitleKey: row.normalizedTitleKey,
      graphTitle,
      graphTrackId: link?.graph_track_id ?? null,
      hasPrimaryVersion: link?.has_primary_version ?? false,
      repairSkipReason,
      skipGroup: group,
      skipGroupDetail: detail,
      peakHot100: row.peakHot100,
    };
  });

  const repairSkipReasons: Record<string, number> = {};
  for (const row of allSkipped) {
    repairSkipReasons[row.repairSkipReason] = (repairSkipReasons[row.repairSkipReason] ?? 0) + 1;
  }

  const groupOrder: SkipGroup[] = [
    "no_tracks_title_source",
    "no_graph_song_exists",
    "vdj_only_identity",
    "corrupted_title_still_present",
    "other",
  ];

  const groups: SkipGroupSummary[] = groupOrder.map((group) => {
    const rows = allSkipped.filter((r) => r.skipGroup === group);
    const examples = [...rows]
      .sort((a, b) => (a.peakHot100 ?? 9999) - (b.peakHot100 ?? 9999))
      .slice(0, 20);
    return {
      group,
      label: GROUP_LABELS[group],
      count: rows.length,
      examples,
    };
  });

  return {
    scannedAt: new Date().toISOString(),
    totalSkipped: allSkipped.length,
    totalCorruptRemaining: graphAudit.affectedRvtrCount,
    repairSkipReasons,
    groups,
    allSkipped,
  };
}

export function formatTitleRepairSkipAuditMarkdown(audit: TitleRepairSkipAudit): string {
  const lines: string[] = [
    "# Title Repair Skip Audit",
    "",
    `**Scanned:** ${audit.scannedAt}  `,
    "**Read-only** — no graph or label modifications.",
    "",
    "Inspects the **410** canonical_title repairs skipped during Match Cleanup Execution.",
    "",
    "---",
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|--------|------:|",
    `| Skipped repairs | ${audit.totalSkipped} |`,
    `| Remaining feat-corruption RVTRs | ${audit.totalCorruptRemaining} |`,
    "",
    "### Internal repair skip reasons",
    "",
    "| Reason | Count |",
    "|--------|------:|",
    ...Object.entries(audit.repairSkipReasons)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `| \`${reason}\` | ${count} |`),
    "",
    "### Grouped skip causes",
    "",
    "| Group | Count | % |",
    "|-------|------:|--:|",
    ...audit.groups.map((g) => {
      const pct = audit.totalSkipped > 0 ? Math.round((g.count / audit.totalSkipped) * 1000) / 10 : 0;
      return `| ${g.label} | ${g.count} | ${pct}% |`;
    }),
    "",
    "---",
  ];

  for (const group of audit.groups) {
    lines.push(`## ${group.label} (${group.count})`, "");
    if (group.count === 0) {
      lines.push("_None._", "", "---", "");
      continue;
    }
    lines.push(
      "| RVTR | Artist | Identity | Canonical title | Graph title | Detail |",
      "|------|--------|----------|-----------------|-------------|--------|",
    );
    for (const ex of group.examples) {
      const graph = ex.graphTitle ? ex.graphTitle.replace(/\|/g, "\\|") : "—";
      const canonical = ex.canonicalTitle.replace(/\|/g, "\\|");
      const artist = ex.artist.replace(/\|/g, "\\|");
      lines.push(
        `| \`${ex.rvtr}\` | ${artist} | \`${ex.identitySource}\` | ${canonical} | ${graph} | ${ex.skipGroupDetail} |`,
      );
    }
    if (group.count > group.examples.length) {
      lines.push("", `_Showing ${group.examples.length} of ${group.count}._`);
    }
    lines.push("", "---", "");
  }

  lines.push(
    "## Classification rules",
    "",
    "Priority order (first match wins):",
    "",
    "1. **Corrupted title still present** — graph `tracks.title` also contains ` Feat ` tokenization",
    "2. **No tracks.title source** — graph track linked but `tracks.title` empty",
    "3. **No graph song exists** — hot100/chart row with no primary graph track link",
    "4. **VDJ-only identity** — `identity_source = vdj`, no repair source available",
    "5. **Other** — normalized key mismatch, already clean, unclassified",
    "",
    "---",
    "",
    "## Outputs",
    "",
    "- `AUDIT.md`",
    "- `skip-audit.json`",
    "- `skip-audit.csv`",
  );

  return lines.join("\n");
}

export function skipAuditToCsv(rows: SkipAuditRow[]): string {
  const header = [
    "rvtr",
    "artist",
    "identitySource",
    "canonicalTitle",
    "normalizedTitleKey",
    "graphTitle",
    "graphTrackId",
    "hasPrimaryVersion",
    "repairSkipReason",
    "skipGroup",
    "skipGroupDetail",
    "peakHot100",
  ].join(",");
  const esc = (v: string | number | boolean | null | undefined) => {
    const raw = v == null ? "" : String(v);
    return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  };
  return [
    header,
    ...rows.map((r) =>
      [
        r.rvtr,
        r.artist,
        r.identitySource,
        r.canonicalTitle,
        r.normalizedTitleKey,
        r.graphTitle,
        r.graphTrackId,
        r.hasPrimaryVersion,
        r.repairSkipReason,
        r.skipGroup,
        r.skipGroupDetail,
        r.peakHot100,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}
