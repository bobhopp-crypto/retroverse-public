import type { Confidence, MarkdownRecord, TimelineEvent } from "./types.ts";

const DATE_IN_FILENAME =
  /(?:^|[-_])(20\d{2})[-_](\d{2})[-_](\d{2})(?:[-_.]|$)|(?:^|[-_])(20\d{2})[-_](\d{2})(?:[-_.]|$)/;

const DATE_IN_CONTENT =
  /\*\*(?:Scanned|Generated|Date|Completed|Audit|Report|As of)[:\s]*\*\*\s*(\d{4}-\d{2}-\d{2})|\b(20\d{2}-\d{2}-\d{2})\b/g;

function parseFilenameDate(relPath: string): { date: string; confidence: Confidence } | null {
  const base = relPath.split("/").pop() ?? "";
  const m = base.match(DATE_IN_FILENAME);
  if (!m) return null;
  if (m[1] && m[2] && m[3]) {
    return { date: `${m[1]}-${m[2]}-${m[3]}`, confidence: "medium" };
  }
  if (m[4] && m[5]) {
    return { date: `${m[4]}-${m[5]}-01`, confidence: "low" };
  }
  return null;
}

function milestoneTitle(record: MarkdownRecord): string {
  const base = record.relativePath.split("/").pop() ?? record.title;
  if (/AUDIT/i.test(base)) return `Audit: ${record.title}`;
  if (/IMPLEMENTATION/i.test(base)) return `Implementation: ${record.title}`;
  if (/SPRINT/i.test(base)) return record.title;
  if (/PHASE/i.test(base)) return record.title;
  if (/VALIDATION/i.test(base)) return `Validation: ${record.title}`;
  return record.title;
}

function isMilestone(record: MarkdownRecord): boolean {
  const p = record.relativePath.toLowerCase();
  const name = p.split("/").pop() ?? "";
  return (
    /audit|implementation|sprint|phase|validation|deliverable|report|architecture|brain|roadmap|pilot|summary|completion/.test(
      name,
    ) || record.wordCount > 800
  );
}

export function buildTimeline(records: MarkdownRecord[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    if (!isMilestone(record)) continue;

    const dates: { date: string; source: TimelineEvent["dateSource"]; confidence: Confidence }[] =
      [];

    if (record.gitFirstCommit) {
      dates.push({
        date: record.gitFirstCommit.slice(0, 10),
        source: "git",
        confidence: "high",
      });
    }
    if (record.gitLastCommit && record.gitLastCommit !== record.gitFirstCommit) {
      dates.push({
        date: record.gitLastCommit.slice(0, 10),
        source: "git",
        confidence: "high",
      });
    }

    const fnDate = parseFilenameDate(record.relativePath);
    if (fnDate) {
      dates.push({ date: fnDate.date, source: "filename", confidence: fnDate.confidence });
    }

    if (record.modifiedAt) {
      dates.push({
        date: record.modifiedAt.slice(0, 10),
        source: "filesystem",
        confidence: "low",
      });
    }

    for (const d of dates) {
      const key = `${d.date}|${record.relativePath}|${d.source}`;
      if (seen.has(key)) continue;
      seen.add(key);

      events.push({
        date: d.date,
        dateSource: d.source,
        confidence: d.confidence,
        title: milestoneTitle(record),
        description: record.summary.slice(0, 200),
        project: record.primaryProject,
        evidencePaths: [record.relativePath],
      });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  return events;
}

export function renderTimelineMarkdown(events: TimelineEvent[]): string {
  const lines = [
    "# Retroverse Project Timeline",
    "",
    "Chronological milestones derived from git history, filenames, and document metadata.",
    "Dates are evidence-based — nothing invented.",
    "",
    `**Events:** ${events.length}`,
    "",
  ];

  let currentYear = "";
  for (const ev of events) {
    const year = ev.date.slice(0, 4);
    if (year !== currentYear) {
      lines.push(`## ${year}`, "");
      currentYear = year;
    }
    const conf = ev.confidence === "high" ? "" : ` _(${ev.confidence} confidence, ${ev.dateSource})_`;
    lines.push(`### ${ev.date} — ${ev.title}${conf}`);
    lines.push(`- **Project:** ${ev.project}`);
    if (ev.description) lines.push(`- ${ev.description}`);
    lines.push(`- **Evidence:** \`${ev.evidencePaths[0]}\``);
    lines.push("");
  }

  return lines.join("\n");
}

export function timelineHighlights(events: TimelineEvent[]): string[] {
  return events
    .filter((e) => e.confidence === "high")
    .slice(-20)
    .map((e) => `${e.date}: ${e.title} (${e.project})`);
}
