/**
 * Collector Sprint A3 — resolve Song / Recording / Performance years and timelines.
 * Generic rules only — no artist-specific hardcoding.
 */

import type {
  CollectorPackage,
  CollectorPerformance,
  CollectorResearchFact,
} from "./types";

import type {
  CollectorCanonicalModel,
  CollectorPerformanceEntity,
  CollectorPerformanceKind,
  CollectorRecordingEntity,
  CollectorRecordingKind,
  CollectorSongEntity,
  CollectorTimelineEvent,
  CollectorTimelineEventKind,
  CollectorTimelines,
  CollectorYearResolution,
} from "./entity-model";

const COMPILATION_ALBUM =
  /compilation|greatest hits|golden hits|biggest hits|the singles|best of|collection|anthology|volume\s+i\b|vol\.\s*\d|\(\d{4}\s*remaster\)/i;

const REMASTER = /remaster|deluxe|anniversary|expanded/i;

const YEAR_IN_TEXT = /\b(19|20)\d{2}\b/g;

const ORIGINAL_RELEASE_HINT =
  /lead single|debut (?:solo )?album|debut studio|first (?:appeared|released|recorded)|written in|composed in|recorded in|original (?:release|recording)|studio album/i;

const COMPILATION_HINT = /compilation album|greatest hits|singles collection|reissue|re-release/i;

function stableTimelineId(domain: string, kind: string, seed: string): string {
  let hash = 0;
  const s = `${domain}:${kind}:${seed}`;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return `tl-${Math.abs(hash).toString(36)}`;
}

function recordingIdFromTitle(title: string, year: number | null): string {
  let hash = 0;
  const s = `${title}:${year ?? "na"}`;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return `rec-${Math.abs(hash).toString(36)}`;
}

export function isCompilationAlbumTitle(albumTitle: string | null | undefined): boolean {
  if (!albumTitle?.trim()) return false;
  return COMPILATION_ALBUM.test(albumTitle);
}

function extractYears(text: string): number[] {
  const matches = text.match(YEAR_IN_TEXT) ?? [];
  return [...new Set(matches.map((y) => Number(y)).filter((y) => y >= 1900 && y <= 2100))];
}

function allResearchTexts(pkg: CollectorPackage): string[] {
  const texts: string[] = [];
  for (const fact of pkg.candidateFacts) texts.push(fact.text);
  for (const note of pkg.recording.notes) texts.push(note);
  for (const note of pkg.culturalContext.notes) texts.push(note);
  return texts.filter(Boolean);
}

function isCompilationContext(text: string): boolean {
  return (
    COMPILATION_HINT.test(text) ||
    COMPILATION_ALBUM.test(text) ||
    /compilation anchor|not the song's original release/i.test(text)
  );
}

function originalReleaseCandidates(
  texts: string[],
  graphYear: number | null,
  isCompilation: boolean,
): Array<{ year: number; confidence: number; source: string }> {
  const out: Array<{ year: number; confidence: number; source: string }> = [];

  for (const text of texts) {
    if (/DJ MEDIA|\.mp4|\.mp3|\/users\//i.test(text)) continue;

    const years = extractYears(text);
    if (years.length === 0) continue;

    const isOriginalHint = ORIGINAL_RELEASE_HINT.test(text);
    const compilationContext = isCompilationContext(text);

    if (compilationContext && !isOriginalHint) continue;

    for (const year of years) {
      if (isCompilation && graphYear != null && year === graphYear && !isOriginalHint) continue;

      let confidence = 0.55;
      if (isOriginalHint) confidence = 0.88;
      else if (/released in|released on|released as/i.test(text)) confidence = 0.72;
      out.push({ year, confidence, source: text.slice(0, 120) });
    }
  }

  return out;
}

function pickBestSongYearCandidate(
  candidates: Array<{ year: number; confidence: number; source: string }>,
  isCompilation: boolean,
): { year: number; confidence: number; source: string } | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return isCompilation ? a.year - b.year : b.year - a.year;
  });
  return sorted[0] ?? null;
}

function inferSongOriginalYear(
  pkg: CollectorPackage,
  performances: CollectorPerformance[],
  graphYear: number | null,
  graphAlbum: string | null,
  isCompilation: boolean,
): { year: number | null; confidence: number; source: string } {
  const texts = allResearchTexts(pkg);
  const candidates = originalReleaseCandidates(texts, graphYear, isCompilation);
  const best = pickBestSongYearCandidate(candidates, isCompilation);

  if (best && !(isCompilation && graphYear != null && best.year === graphYear)) {
    return { year: best.year, confidence: best.confidence, source: "research text" };
  }

  const perfYears = performances
    .map((p) => p.detectedYear)
    .filter((y): y is number => y != null);

  if (isCompilation && graphYear != null && perfYears.length > 0) {
    const minPerf = Math.min(...perfYears);
    if (minPerf < graphYear - 3) {
      return {
        year: minPerf,
        confidence: 0.58,
        source: "owned performance archival dating (compilation graph anchor excluded)",
      };
    }
  }

  if (!isCompilation && graphYear != null) {
    return { year: graphYear, confidence: 0.85, source: "Retroverse graph album release" };
  }

  if (perfYears.length === 1) {
    return {
      year: perfYears[0]!,
      confidence: 0.45,
      source: "single owned performance year (weak song anchor)",
    };
  }

  return { year: null, confidence: 0.2, source: "unresolved" };
}

function inferRecordingKind(albumTitle: string | null, isCompilation: boolean): CollectorRecordingKind {
  if (!albumTitle) return "unknown";
  if (isCompilation) return "compilation";
  if (REMASTER.test(albumTitle)) return "remaster";
  if (/live/i.test(albumTitle)) return "live_album";
  return "studio_album";
}

function parsePerformanceKind(title: string, filePath: string): CollectorPerformanceKind {
  const hay = `${title} ${filePath}`.toLowerCase();
  if (/live aid|wembley|unplugged|concert|live at|live from|festival|tour/i.test(hay)) {
    return /tv|television|mtv|show|tonight|letterman|snl|top of the pops/i.test(hay)
      ? "television"
      : "concert";
  }
  if (/official video|music video|promo/i.test(hay)) return "music_video";
  if (/mtv|television|tv\b|bbc|nbc|abc|cbs|show/i.test(hay)) return "television";
  if (/grammy|award|vma|mtv awards/i.test(hay)) return "award_show";
  if (/live/i.test(hay)) return "live";
  if (/festival|glastonbury|coachella|woodstock/i.test(hay)) return "festival";
  return "unknown";
}

function parseCityCountry(venue: string | null): { city: string | null; country: string | null } {
  if (!venue?.trim()) return { city: null, country: null };
  const parts = venue
    .split(/[,·]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0] ?? null, country: parts[parts.length - 1] ?? null };
  }
  if (/denmark|london|philadelphia|wembley|paris|tokyo|berlin|nashville|memphis/i.test(venue)) {
    return { city: null, country: venue.trim() };
  }
  return { city: venue.trim(), country: null };
}

function parseEvent(title: string, filePath: string): string | null {
  const hay = `${title} ${filePath}`;
  if (/live aid/i.test(hay)) return "Live Aid";
  const tv = hay.match(/\b(MTV Unplugged|Top of the Pops|The Ed Sullivan Show)\b/i);
  if (tv?.[1]) return tv[1];
  return null;
}

function buildRecordingEntities(
  pkg: CollectorPackage,
  graphYear: number | null,
  graphAlbum: string | null,
  isCompilation: boolean,
): CollectorRecordingEntity[] {
  const recordings: CollectorRecordingEntity[] = [];
  const texts = allResearchTexts(pkg);

  if (graphAlbum || graphYear != null) {
    recordings.push({
      id: recordingIdFromTitle(graphAlbum ?? pkg.title, graphYear),
      kind: inferRecordingKind(graphAlbum, isCompilation),
      title: graphAlbum ?? `${pkg.title} — graph recording`,
      recordingDate: null,
      recordingLocation: null,
      producer: null,
      engineer: null,
      musicians: [],
      albumTitle: graphAlbum,
      isCompilation,
      isRemaster: REMASTER.test(graphAlbum ?? ""),
      label: null,
      releaseDate: graphYear,
      catalogNumber: null,
      notes: pkg.recording.notes.slice(0, 6),
      confidence: isCompilation ? 0.82 : 0.88,
      source: "Retroverse graph",
    });
  }

  for (const text of texts) {
    if (!ORIGINAL_RELEASE_HINT.test(text) || COMPILATION_HINT.test(text)) continue;
    const years = extractYears(text);
    const studioYear = years.find((y) => y !== graphYear) ?? years[0];
    if (studioYear == null) continue;

    const albumMatch = text.match(/album[,\s]+["“]([^"”]+)["”]/i);
    const albumTitle = albumMatch?.[1]?.trim() ?? null;
    if (!albumTitle) continue;

    const exists = recordings.some(
      (r) => r.albumTitle?.toLowerCase() === albumTitle.toLowerCase() && r.releaseDate === studioYear,
    );
    if (exists) continue;

    recordings.push({
      id: recordingIdFromTitle(albumTitle, studioYear),
      kind: "original_studio",
      title: albumTitle,
      recordingDate: studioYear,
      recordingLocation: null,
      producer: null,
      engineer: null,
      musicians: [],
      albumTitle,
      isCompilation: false,
      isRemaster: false,
      label: null,
      releaseDate: studioYear,
      catalogNumber: null,
      notes: [text.slice(0, 200)],
      confidence: 0.78,
      source: "research enrichment",
    });
  }

  return recordings;
}

function toPerformanceEntity(perf: CollectorPerformance): CollectorPerformanceEntity {
  const kind = parsePerformanceKind(perf.title, perf.virtualDjFilePath ?? "");
  const { city, country } = parseCityCountry(perf.detectedVenue);
  const event = parseEvent(perf.title, perf.virtualDjFilePath ?? "");

  return {
    id: perf.id,
    title: perf.title,
    kind,
    virtualDjFilePath: perf.virtualDjFilePath,
    sourceVideo: perf.sourceVideo,
    venue: perf.detectedVenue,
    city,
    country,
    performanceYear: perf.detectedYear,
    event,
    tvShow: kind === "television" ? perf.title : null,
    tour: /tour/i.test(perf.title) ? perf.title : null,
    durationSec: perf.durationSec,
    qualityScore: perf.qualityScore,
    performanceNotes: perf.collectorNotes,
    facts: perf.facts,
    confidence: perf.confidence,
  };
}

function buildSongEntity(
  pkg: CollectorPackage,
  songRelease: { year: number | null; confidence: number; source: string },
  originalAlbum: string | null,
): CollectorSongEntity {
  const cultural = [
    ...pkg.culturalContext.notes.slice(0, 4),
    ...pkg.candidateFacts
      .filter((f) => f.category === "cultural_impact")
      .map((f) => f.text)
      .slice(0, 4),
  ];

  const writers: string[] = [];
  for (const text of allResearchTexts(pkg)) {
    const m = text.match(/written by ([^.]+)/i);
    if (m?.[1]) writers.push(m[1].trim());
  }

  return {
    rvtr: pkg.rvtr,
    artist: pkg.artist,
    title: pkg.title,
    writers: [...new Set(writers)].slice(0, 6),
    originalReleaseYear: songRelease.year,
    originalAlbum,
    peakHot100: pkg.charts.peakHot100,
    chartWeeks: pkg.charts.chartWeeks,
    certifications: [],
    culturalSignificance: cultural.slice(0, 6),
    relatedArtists: pkg.relationships.relatedArtists,
    legacy: pkg.culturalContext.notes.slice(0, 3),
    confidence: Math.round(songRelease.confidence * 100),
  };
}

function timelineEvent(
  domain: CollectorTimelineEvent["domain"],
  kind: CollectorTimelineEventKind,
  year: number | null,
  label: string,
  detail: string | null,
  confidence: number,
  source: string,
  entityRef: string | null = null,
): CollectorTimelineEvent {
  return {
    id: stableTimelineId(domain, kind, label),
    domain,
    kind,
    year,
    label,
    detail,
    confidence,
    source,
    entityRef,
  };
}

function buildTimelines(
  song: CollectorSongEntity,
  recordings: CollectorRecordingEntity[],
  performances: CollectorPerformanceEntity[],
): CollectorTimelines {
  const songEvents: CollectorTimelineEvent[] = [];

  if (song.originalReleaseYear != null) {
    songEvents.push(
      timelineEvent(
        "song",
        "release",
        song.originalReleaseYear,
        `${song.title} — original release`,
        song.originalAlbum ? `Original album: ${song.originalAlbum}` : null,
        song.confidence / 100,
        "song entity",
      ),
    );
  }

  if (song.peakHot100 != null) {
    songEvents.push(
      timelineEvent(
        "song",
        "chart",
        song.originalReleaseYear,
        `Billboard Hot 100 peak #${song.peakHot100}`,
        song.chartWeeks ? `${song.chartWeeks} weeks on chart` : null,
        0.95,
        "Retroverse graph",
      ),
    );
  }

  for (const note of song.culturalSignificance.slice(0, 3)) {
    const years = extractYears(note);
    songEvents.push(
      timelineEvent(
        "song",
        "legacy",
        years[0] ?? null,
        note.slice(0, 100),
        note.length > 100 ? note.slice(100, 220) : null,
        0.7,
        "cultural research",
      ),
    );
  }

  const recordingEvents: CollectorTimelineEvent[] = [];
  for (const rec of recordings) {
    const kind: CollectorTimelineEventKind = rec.isCompilation
      ? "compilation"
      : rec.isRemaster
        ? "remaster"
        : rec.kind === "original_studio"
          ? "session"
          : "album";

    recordingEvents.push(
      timelineEvent(
        "recording",
        kind,
        rec.releaseDate,
        rec.title,
        rec.notes[0]?.slice(0, 160) ?? null,
        rec.confidence,
        rec.source,
        rec.id,
      ),
    );
  }

  const performanceEvents: CollectorTimelineEvent[] = [];
  for (const perf of performances) {
    const kind: CollectorTimelineEventKind =
      perf.kind === "television"
        ? "television"
        : perf.kind === "music_video"
          ? "music_video"
          : perf.kind === "festival"
            ? "festival"
            : perf.kind === "award_show"
              ? "award_show"
              : perf.kind === "concert" || perf.kind === "live"
                ? "concert"
                : "other";

    performanceEvents.push(
      timelineEvent(
        "performance",
        kind,
        perf.performanceYear,
        perf.title,
        [perf.venue, perf.event].filter(Boolean).join(" · ") || null,
        perf.confidence,
        "owned video",
        perf.id,
      ),
    );
  }

  return {
    song: songEvents.slice(0, 12),
    recording: recordingEvents.slice(0, 12),
    performance: performanceEvents.slice(0, 12),
  };
}

function buildYearResolution(
  songRelease: { year: number | null; confidence: number; source: string },
  graphYear: number | null,
  graphAlbum: string | null,
  isCompilation: boolean,
  primaryPerf: CollectorPerformanceEntity | null,
): CollectorYearResolution {
  const conflicts: string[] = [];
  const notes: string[] = [];

  const recordingRelease: CollectorYearResolution["recordingRelease"] = {
    year: graphYear,
    label: graphAlbum
      ? isCompilation
        ? `Compilation: ${graphAlbum}`
        : `Album: ${graphAlbum}`
      : "Graph recording release",
    confidence: graphYear != null ? (isCompilation ? 0.82 : 0.88) : 0.2,
    source: "Retroverse graph",
  };

  if (
    songRelease.year != null &&
    graphYear != null &&
    songRelease.year !== graphYear &&
    isCompilation
  ) {
    notes.push(
      `Song original release (${songRelease.year}) is separate from graph compilation anchor (${graphYear}).`,
    );
  } else if (
    songRelease.year != null &&
    graphYear != null &&
    songRelease.year !== graphYear &&
    !isCompilation
  ) {
    conflicts.push(`Song release year (${songRelease.year}) differs from graph year (${graphYear}).`);
  }

  if (
    primaryPerf?.performanceYear != null &&
    songRelease.year != null &&
    primaryPerf.performanceYear !== songRelease.year &&
    Math.abs(primaryPerf.performanceYear - songRelease.year) > 2
  ) {
    notes.push(
      `Performance year (${primaryPerf.performanceYear}) documents a captured moment — not the song's original release.`,
    );
  }

  return {
    songRelease: {
      year: songRelease.year,
      label: "Song original release",
      confidence: songRelease.confidence,
      source: songRelease.source,
    },
    recordingRelease,
    primaryPerformance: primaryPerf
      ? {
          year: primaryPerf.performanceYear,
          label: primaryPerf.title,
          confidence: primaryPerf.confidence,
          source: "owned performance video",
        }
      : null,
    conflicts,
    notes,
  };
}

/** Resolve canonical Song / Recording / Performance model from pipeline output. */
export function buildCanonicalModel(
  pkg: CollectorPackage,
  performances: CollectorPerformance[],
): CollectorCanonicalModel {
  const graphYear = pkg.identity.year;
  const graphAlbum = pkg.identity.albumTitle;
  const isCompilation = isCompilationAlbumTitle(graphAlbum);

  const songRelease = inferSongOriginalYear(
    pkg,
    performances,
    graphYear,
    graphAlbum,
    isCompilation,
  );

  const originalAlbum =
    pkg.candidateFacts
      .map((f) => f.text)
      .concat(pkg.recording.notes)
      .find((t) => ORIGINAL_RELEASE_HINT.test(t) && !COMPILATION_HINT.test(t))
      ?.match(/album[,\s]+["“]([^"”]+)["”]/i)?.[1]
      ?.trim() ?? (isCompilation ? null : graphAlbum);

  const recordings = buildRecordingEntities(pkg, graphYear, graphAlbum, isCompilation);
  const performanceEntities = performances.map(toPerformanceEntity);
  const primaryPerf = performanceEntities[0] ?? null;

  const song = buildSongEntity(pkg, songRelease, originalAlbum);
  const timelines = buildTimelines(song, recordings, performanceEntities);
  const yearResolution = buildYearResolution(
    songRelease,
    graphYear,
    graphAlbum,
    isCompilation,
    primaryPerf,
  );

  return {
    song,
    recordings,
    performances: performanceEntities,
    timelines,
    yearResolution,
  };
}

/** Scope research facts to song, recording, or performance — never merge timelines. */
export function scopeResearchFacts(
  facts: CollectorResearchFact[],
  model: CollectorCanonicalModel,
  performances: CollectorPerformance[],
): CollectorResearchFact[] {
  const graphRecordingYear = model.yearResolution.recordingRelease.year;
  const songYear = model.song.originalReleaseYear;
  const primaryPerfId = performances[0]?.id ?? null;

  return facts.map((fact) => {
    const text = fact.text;
    let scope: "song" | "recording" | "performance" = "song";
    let scopeRef: string | null = null;

    if (/virtualdj|owned media|\.mp4|\.mp3|performance:|venue or tour|performance year/i.test(text)) {
      scope = "performance";
      scopeRef = primaryPerfId;
    } else if (
      COMPILATION_HINT.test(text) ||
      (graphRecordingYear != null &&
        text.includes(String(graphRecordingYear)) &&
        model.recordings.some((r) => r.isCompilation))
    ) {
      scope = "recording";
      scopeRef = model.recordings.find((r) => r.isCompilation)?.id ?? model.recordings[0]?.id ?? null;
    } else if (
      fact.category === "recording" &&
      songYear != null &&
      text.includes(String(songYear)) &&
      !COMPILATION_ALBUM.test(text)
    ) {
      scope = "song";
    } else if (fact.category === "album") {
      scope = model.recordings.some((r) => r.isCompilation) ? "recording" : "song";
      scopeRef = model.recordings[0]?.id ?? null;
    } else if (fact.category === "chart" || fact.category === "cultural_impact") {
      scope = "song";
    } else if (fact.category === "performance" || fact.category === "video") {
      scope = "performance";
      scopeRef = primaryPerfId;
    }

    return { ...fact, scope, scopeRef };
  });
}

export function primaryNarrativeYear(
  model: CollectorCanonicalModel,
  storyAngle: string | null | undefined,
): number | null {
  switch (storyAngle) {
    case "live_performance":
      return model.yearResolution.primaryPerformance?.year ?? model.song.originalReleaseYear;
    case "technical_innovation":
      return (
        model.recordings.find((r) => r.kind === "original_studio")?.releaseDate ??
        model.song.originalReleaseYear
      );
    case "career_turning_point":
      return model.song.originalReleaseYear ?? model.yearResolution.recordingRelease.year;
    default:
      return model.song.originalReleaseYear ?? model.yearResolution.recordingRelease.year;
  }
}
