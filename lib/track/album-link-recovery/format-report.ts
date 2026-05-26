import type {
  AlbumLinkRecoverySummary,
  TrackAlbumLinkAudit,
} from "@/lib/track/album-link-recovery/types";

export function formatTrackAudit(audit: TrackAlbumLinkAudit): string {
  const lines: string[] = [
    `## ${audit.rvtr} — ${audit.title} · ${audit.artistName}`,
    `- gap: **${audit.gap}** | existing links: ${audit.existingLinkCount} | chart weeks: ${audit.chartWeeks} | peak: ${audit.peakHot100 ?? "—"}`,
    "",
    "### Diagnosis",
    ...audit.diagnosis.map((d) => `- ${d}`),
  ];

  if (audit.candidates.length > 0) {
    lines.push("", "### Candidates (preview only)");
    for (const c of audit.candidates) {
      lines.push(
        `- **${c.confidence}** album_id=${c.albumId} "${c.albumTitle}" (${c.artistName}, ${c.releaseYear ?? "?"}) — ${c.sourceKind}`,
      );
      lines.push(`  - reasons: ${c.reasons.join(", ")}`);
      if (c.sequenceTitle) {
        lines.push(`  - slot: #${c.trackPosition ?? "?"} "${c.sequenceTitle}" rvtr_on_slot=${c.existingRvtrOnSlot ?? "—"}`);
      }
    }
  }

  return lines.join("\n");
}

export function formatRecoverySummary(report: AlbumLinkRecoverySummary): string {
  const header = [
    "# Album-link recovery audit (preview)",
    "",
    `Generated: ${report.generatedAt}`,
    `Hot 100 tracks: ${report.hot100Total.toLocaleString()}`,
    `Missing canonical_album_tracks: ${report.hot100MissingLinks.toLocaleString()} (${report.pctMissing}%)`,
    "",
    "> No writes performed. Approve proposals manually before any apply.",
    "",
  ];

  const body = report.audits.map((a) => formatTrackAudit(a)).join("\n\n---\n\n");
  return `${header.join("\n")}\n${body}\n`;
}
