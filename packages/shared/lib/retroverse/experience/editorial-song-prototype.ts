import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TrackPageData } from "@/lib/track/load-track-page";
import { inspectQuery } from "@/lib/inspect/pg";
import { trackPageHref } from "@/lib/search/entity-routes";

export type EditorialSongArticle = {
  headline: string;
  deck: string;
  paragraphs: string[];
  sourceLabel: string;
  sourceUrl: string;
};

export type ChartTrajectoryRecommendation = {
  rvtr: string;
  title: string;
  releaseYear: number | null;
  href: string;
  reason: string;
  score?: number;
};

export type EditorialDiversityRecord = {
  rvtr: string;
  artist: string;
  title: string;
  year: number | null;
  yearSource: string;
  headline: string;
  paragraphs: string[];
  articleWordCount: number;
  researchSources: string[];
  related: Array<ChartTrajectoryRecommendation & { method: string; ownedVideoPath: string; canonicalRoute: string }>;
  classification?: string;
  finalStatus?: string;
};

const PROTOTYPE_RVTR = "RVTR111098";

export async function loadEditorialDiversityRecord(rvtr: string): Promise<EditorialDiversityRecord | null> {
  try {
    const raw = await readFile(join(process.cwd(), "data/ops/intelligence/editorial-diversity-25.json"), "utf8");
    const data = JSON.parse(raw) as { records?: EditorialDiversityRecord[] };
    return data.records?.find((record) => record.rvtr === rvtr.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

/** The bounded frame-aware Live fallback pilot. */
export async function loadLiveStoryPilotRecord(rvtr: string): Promise<EditorialDiversityRecord | null> {
  try {
    let raw = "";
    for (const candidate of [
      join(process.cwd(), "reports/song-preparation-pilot-25/preparation-manifest.json"),
      join(process.cwd(), "data/reports/song-preparation-pilot-25/preparation-manifest.json"),
      join(process.cwd(), "..", "reports/song-preparation-pilot-25/preparation-manifest.json"),
    ]) {
      try { raw = await readFile(candidate, "utf8"); break; } catch { /* try the next runtime root */ }
    }
    if (!raw) return null;
    const records = JSON.parse(raw).records as Array<Record<string, unknown>>;
    const normalized = rvtr.trim().toUpperCase();
    if (!records.some((record) => String(record.rvtr ?? "").toUpperCase() === normalized && record.preparationStatus === "READY")) return null;
    const record = await loadEditorialDiversityRecord(normalized);
    if (!record) return null;
    const words = record.paragraphs.join(" ").split(/\s+/).filter(Boolean);
    if (words.length <= 180) return record;
    let remaining = 180;
    const paragraphs: string[] = [];
    for (const paragraph of record.paragraphs) {
      if (remaining <= 0) break;
      const paragraphWords = paragraph.split(/\s+/).filter(Boolean);
      const selected = paragraphWords.slice(0, remaining);
      if (selected.length) paragraphs.push(selected.join(" "));
      remaining -= selected.length;
    }
    return { ...record, paragraphs, articleWordCount: paragraphs.join(" ").split(/\s+/).filter(Boolean).length };
  } catch {
    return null;
  }
}

export async function loadEditorialProductionRecord(rvtr: string): Promise<EditorialDiversityRecord | null> {
  try {
    const raw = await readFile(join(process.cwd(), "data/ops/intelligence/editorial-production-100.json"), "utf8");
    const data = JSON.parse(raw) as { records?: EditorialDiversityRecord[] };
    return data.records?.find((record) => record.rvtr === rvtr.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

/** Bounded C2 acceptance overlay. It is read-only and falls through to the
 * established production manifest when the same subject is not in the proof. */
export async function loadC2ProductionProofRecord(rvtr: string): Promise<EditorialDiversityRecord | null> {
  try {
    const raw = await readFile(join(process.cwd(), "reports/c2-production-proof-25/c2-editorial-manifest.json"), "utf8");
    const inventoryRaw = await readFile(join(process.cwd(), "data/ops/manifest/video-completion-manifest.json"), "utf8");
    const records = JSON.parse(raw) as Array<Record<string, any>>;
    const inventory = JSON.parse(inventoryRaw) as { records?: Array<Record<string, any>> };
    const normalized = rvtr.trim().toUpperCase();
    const record = records.find((candidate) => {
      if (candidate.rvtr && String(candidate.rvtr).toUpperCase() === normalized) return true;
      if (!/^VDJ:[0-9A-F]{16}$/i.test(normalized)) return false;
      const path = String(candidate.vdjResearchBrief?.path ?? "");
      return inventory.records?.some((entry) => String(entry.vdjPath) === path && String(entry.videoExperienceId ?? "").toUpperCase() === normalized);
    });
    if (!record) return null;
    const article = String(record.article ?? "").trim();
    if (!article) return null;
    return {
      rvtr: normalized,
      artist: String(record.editorialSubject ?? record.subject ?? "").split(" — ")[0] ?? "",
      title: String(record.editorialSubject ?? record.subject ?? "").split(" — ").slice(1).join(" — ") ?? "",
      year: record.vdjResearchBrief?.year ?? null,
      yearSource: "c2-open-research",
      headline: String(record.headline ?? ""),
      paragraphs: article.split(/\n\n+/).filter(Boolean),
      articleWordCount: Number(record.wordCount ?? 0),
      researchSources: Array.isArray(record.sources) ? record.sources : [],
      related: [],
      classification: String(record.subjectType ?? ""),
      finalStatus: "C2_ACCEPTANCE_PROOF",
    };
  } catch {
    return null;
  }
}

export async function loadC2ProductionBatch100Record(rvtr: string): Promise<EditorialDiversityRecord | null> {
  try {
    const raw = await readFile(join(process.cwd(), "reports/c2-production-batch-100/editorial-manifest.json"), "utf8");
    const selectionRaw = await readFile(join(process.cwd(), "reports/c2-production-batch-100/selection-manifest.json"), "utf8");
    const records = JSON.parse(raw).results as Array<Record<string, any>>;
    const selection = JSON.parse(selectionRaw).records as Array<Record<string, any>>;
    const normalized = rvtr.trim().toUpperCase();
    const selected = selection.find((r) => String(r.videoExperienceId ?? "").toUpperCase() === normalized || String(r.rvtr ?? "").toUpperCase() === normalized);
    const record = records.find((r) => selected && String(r.vdjPath) === String(selected.vdjPath));
    if (!record || !String(record.article ?? "").trim()) return null;
    return {
      rvtr: normalized,
      artist: String(record.artist ?? ""),
      title: String(record.title ?? ""),
      year: selected?.displayYear ?? null,
      yearSource: "c2-batch-research",
      headline: String(record.headline ?? record.title ?? ""),
      paragraphs: String(record.article).split(/\n\n+/).filter(Boolean),
      articleWordCount: Number(record.wordCount ?? 0),
      researchSources: [], related: [], classification: String(selected?.context ?? ""), finalStatus: record.qualityIssues?.length ? "C2_LOCAL_REVIEW_REQUIRED" : "C2_LOCAL_EDITOR_PASS",
    };
  } catch { return null; }
}

/** Authoritative publication overlay. Only TERRA_FINAL records are eligible. */
export async function loadAuthoritativeTerraFinalRecord(
  rvtr: string,
  subject?: { artist?: string | null; title?: string | null },
): Promise<EditorialDiversityRecord | null> {
  try {
    const runtimeDataPath = (relativePath: string) => [
      join(process.cwd(), "data", relativePath),
      join(process.cwd(), relativePath),
      join(process.cwd(), "..", relativePath),
    ];
    const readRuntimeJson = async (relativePath: string) => {
      for (const candidate of runtimeDataPath(relativePath)) {
        try { return JSON.parse(await readFile(candidate, "utf8")); } catch { /* try next runtime root */ }
      }
      return null;
    };
    const data = await readRuntimeJson("ops/manifest/c2-final-editor-backlog.json");
    if (!data) return null;
    const records = data.records as Array<Record<string, any>>;
    const normalized = rvtr.trim().toUpperCase();
    const subjectText = `${subject?.artist ?? ""} — ${subject?.title ?? ""}`.trim().toLowerCase();
    const record = records.find((candidate) =>
      candidate.finalEditorialStatus === "TERRA_FINAL" &&
      (String(candidate.durableIdentity ?? "").toUpperCase() === normalized ||
        String(candidate.editorialSubject ?? "").trim().toLowerCase() === subjectText),
    );
    if (!record || !record.headline || !record.articleReference) return null;
    const sourcePath = typeof record.articleReference?.source === "string"
      ? record.articleReference.source
      : "reports/c2-terra-backlog-completion/terra-final-manifest.json";
    const finalManifest = await readRuntimeJson(sourcePath);
    const final = finalManifest?.results?.find((result: any) =>
      result.durableIdentity === record.durableIdentity ||
      String(result.subject ?? result.durableSubject ?? "").trim().toLowerCase() === String(record.editorialSubject ?? "").trim().toLowerCase(),
    );
    const article = String(final?.article ?? "").trim();
    if (!article) return null;
    return {
      rvtr: normalized,
      artist: String(record.editorialSubject ?? "").split(" — ")[0] ?? "",
      title: String(record.editorialSubject ?? "").split(" — ").slice(1).join(" — ") ?? "",
      year: null,
      yearSource: "authoritative-editorial-manifest",
      headline: String(final.headline ?? record.headline),
      paragraphs: article.split(/\n\n+/).filter(Boolean),
      articleWordCount: Number(final.wordCount ?? 0),
      researchSources: [],
      related: [],
      classification: "authoritative-terra-final",
      finalStatus: "TERRA_FINAL",
    };
  } catch { return null; }
}

export const SHE_IS_A_BEAUTY_ARTICLE: EditorialSongArticle = {
  headline: "A strange little world made for the first MTV generation",
  deck: "The Tubes turned a troubling image into a theatrical pop song — then let early music television make the character impossible to ignore.",
  paragraphs: [
    "The Tubes were never interested in making pop music behave politely. By the time “She’s a Beauty” arrived in 1983, the San Francisco band had already built a reputation around theatrical excess, alter egos, and songs that felt like small rooms with something unsettling happening inside them. This one found its center in a peep-show premise: a person on display, an audience looking in, and a singer caught between attraction and discomfort.",
    "That tension is what keeps the song from becoming a simple novelty. The phrase in the title sounds admiring, but the situation around it is deliberately awkward. The song understands the transaction — somebody performs, somebody watches, and somebody pays — while its bright synths and clean pop-rock frame make the whole scene feel almost inviting. The discomfort is not an extra detail added around the hook. It is the hook’s shadow.",
    "The recording also arrived at exactly the right moment for the band’s visual instincts. “She’s a Beauty” reached #10 on the Billboard Hot 100 and stayed on the chart for 20 weeks, but its world was larger than those numbers. The song could move through radio as a polished single while still carrying the Tubes’ taste for spectacle. It sounded made for a stage, yet it was about to find an even more efficient stage in the early music-video era.",
    "The video gives Fee Waybill a role inside the attraction rather than placing him safely outside it. That choice makes the song’s looking-and-being-looked-at idea visible: the singer is not merely describing the scene; he is part of its machinery. Early MTV rewarded songs that could become instantly legible images, and the Tubes understood that a strange premise becomes more memorable when it has a costume, a set, and a face to return to.",
    "That is the lasting trick of “She’s a Beauty.” It disguises a complicated little encounter as an immaculate pop single, then uses performance to keep the complication alive. The result is catchy enough to remember and peculiar enough to revisit. The chart peak tells us how far the song traveled. The video explains why its uneasy room is still so easy to walk back into.",
  ],
  sourceLabel: "American Songwriter",
  sourceUrl: "https://americansongwriter.com/the-meaning-behind-shes-a-beauty-by-the-tubes-and-the-real-life-peep-show-that-inspired-it/",
};

type CandidateRow = {
  rvtr: string;
  title: string;
  first_chart_date: string | null;
  peak_hot100_position: number | null;
  positions: number[] | null;
};

function fingerprint(weeks: TrackPageData["trajectoryWeeks"]): number[] {
  return [
    weeks[0]?.rank ?? 200,
    weeks.findIndex((week) => week.rank <= 40),
    weeks.findIndex((week) => week.rank <= 10),
    Math.min(...weeks.map((week) => week.rank)),
    weeks.length,
    weeks.length > 1 ? (weeks[weeks.length - 1]!.rank - weeks[0]!.rank) / (weeks.length - 1) : 0,
  ];
}

function distance(a: number[], b: number[]): number {
  const weights = [1.4, 1.2, 1.2, 1.5, 0.8, 0.35];
  return a.reduce((sum, value, index) => sum + Math.abs(value - b[index]!) * weights[index]!, 0);
}

function reason(target: number[], candidate: number[]): string {
  if (Math.abs(target[1]! - candidate[1]!) <= 1 && Math.abs(target[2]! - candidate[2]!) <= 1) return "A nearly identical climb into the Top 40 and Top 10.";
  if (Math.abs(target[4]! - candidate[4]!) <= 2) return `A very close ${candidate[4]}-week chart arc.`;
  if (candidate[1]! > 2 && candidate[2]! > 2) return "Another late-breaking climb that took time to reach the upper chart.";
  return "A comparable climb, peak, and decline pattern.";
}

export async function loadChartTrajectoryRecommendations(track: TrackPageData): Promise<ChartTrajectoryRecommendation[]> {
  if (track.rvtr !== PROTOTYPE_RVTR || track.trajectoryWeeks.length === 0) return [];
  const target = fingerprint(track.trajectoryWeeks);
  const rows = await inspectQuery<CandidateRow>(
    `SELECT upper(trim(ctd.track_id)) AS rvtr, ctd.canonical_title AS title,
            ctd.first_chart_date::text AS first_chart_date,
            ctd.peak_hot100_position,
            array_agg(ca.chart_position ORDER BY ca.chart_date ASC)::int[] AS positions
       FROM canonical_track_display ctd
       JOIN chart_appearances ca ON ca.track_id = ctd.graph_track_id
      WHERE ctd.has_hot100 = true
        AND ca.chart_name ILIKE '%Hot 100%'
        AND upper(trim(ctd.track_id)) <> $1
      GROUP BY ctd.track_id, ctd.canonical_title, ctd.first_chart_date, ctd.peak_hot100_position`,
    [PROTOTYPE_RVTR],
  );
  return rows
    .map((row) => {
      const weeks = (row.positions ?? []).map((rank, index) => ({ rank, issueDate: String(index) })) as TrackPageData["trajectoryWeeks"];
      const candidate = fingerprint(weeks);
      return { rvtr: row.rvtr, title: row.title, releaseYear: row.first_chart_date ? Number(row.first_chart_date.slice(0, 4)) : null, href: trackPageHref(row.rvtr), reason: reason(target, candidate), score: distance(target, candidate) };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}
