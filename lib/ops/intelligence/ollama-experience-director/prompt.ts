import type { DirectorSongInput } from "./types";

function formatStoryCards(cards: DirectorSongInput["storyCards"]): string {
  if (cards.length === 0) return "(none)";
  return cards
    .slice(0, 8)
    .map(
      (c) =>
        `- [rank ${c.rank}] ${c.headline}\n  Fact: ${c.fact.slice(0, 280)}${c.fact.length > 280 ? "…" : ""}\n  Category: ${c.category}`,
    )
    .join("\n");
}

function formatFacts(facts: DirectorSongInput["candidateFacts"]): string {
  if (facts.length === 0) return "(none)";
  return facts
    .slice(0, 12)
    .map(
      (f) =>
        `- [${f.reviewStatus}] (${f.category}) ${f.factText.slice(0, 200)}${f.factText.length > 200 ? "…" : ""}`,
    )
    .join("\n");
}

function formatTimeline(events: DirectorSongInput["timelineEvents"]): string {
  if (events.length === 0) return "(none)";
  return events
    .map((e) => `- ${e.year ?? "?"}: ${e.title} — ${e.description}`)
    .join("\n");
}

function formatDiscovery(candidates: DirectorSongInput["discoveryCandidates"]): string {
  if (candidates.length === 0) return "(none)";
  return candidates
    .map((d) => `- [${d.kind}] ${d.title}${d.reason ? ` — ${d.reason}` : ""}`)
    .join("\n");
}

export function buildDirectorPrompt(input: DirectorSongInput): string {
  return `You are the Retroverse Song Experience Director — a package/exhibit curator, NOT a chatbot.

Your job: decide what belongs on the PUBLIC song experience page for this track.
Curate ruthlessly. Omit weak, duplicate, or unverified material. Prefer a short, strong page over a cluttered one.

SONG IDENTITY (internal reference only — never mention RVTR or internal IDs in public copy):
- RVTR: ${input.rvtr}
- Title: ${input.title}
- Artist: ${input.artist}
- Year: ${input.year ?? "unknown"}
- Album: ${input.album ?? "unknown"}
- Library play count: ${input.playCount}

CHART HISTORY:
${input.chartHistorySummary ?? "(no chart history)"}
${input.trajectorySummary ? `\nTrajectory: ${input.trajectorySummary}` : ""}

STORY CARDS (approved package stories):
${formatStoryCards(input.storyCards)}

CANDIDATE FACTS (may include unapproved — verify before using):
${formatFacts(input.candidateFacts)}

TIMELINE EVENTS:
${formatTimeline(input.timelineEvents)}

DISCOVERY CANDIDATES (related songs/albums/artist/year hooks):
${formatDiscovery(input.discoveryCandidates)}

COVER / ARTWORK:
- Has cover: ${input.coverStatus.hasCover ? "yes" : "NO — do not pretend artwork exists"}
- Album title on file: ${input.coverStatus.albumTitle ?? "none"}

VIDEO / MEDIA:
- Owned video file: ${input.videoStatus.hasOwnedVideo ? "yes" : "no"}
- VDJ media linked: ${input.videoStatus.hasVdjMedia ? "yes" : "no"}
${input.videoStatus.filePath ? `- Path: ${input.videoStatus.filePath}` : ""}

PACKAGE STATUS:
- Status: ${input.packageStatus.status ?? "none"}
- Story cards: ${input.packageStatus.storyCardCount}
- Artifacts ready: ${input.packageStatus.artifactReady ? "yes" : "no"}
- Quality tier: ${input.packageStatus.packageQualityTier}

RULES:
1. Return ONLY valid JSON. No markdown. No prose outside JSON. No code fences.
2. Maximum 5 chapters in "chapters" array.
3. Maximum 3 discovery shelves in "discoveryShelves" array.
4. No internal Retroverse language in public copy (no RVTR, no "canonical", no "package").
5. No RVTR in title, body, heroNote, or chapter text.
6. No duplicate facts across chapters.
7. No placeholder content ("TBD", "coming soon", lorem ipsum).
8. If the best page is only Hero + Chart + Discovery, say so in bestAngle and keep chapters minimal.
9. If a fact seems wrong, suspicious, or unverified — flag it in qualityNotes; do NOT use it in chapters.
10. If artwork is missing, do not pretend it exists.
11. If a story is weak or redundant, omit it and explain in omitReasons.
12. Merge overlapping stories into one stronger chapter when appropriate.
13. "items" in discoveryShelves are human-readable titles (song/album names), not IDs.
14. publicReadiness: "ready" only if the curated page would feel complete; "needs_more_research" if thin but promising; "not_ready" if too sparse or unreliable.

Return this exact JSON shape:
{
  "rvtr": "${input.rvtr}",
  "title": "${input.title.replace(/"/g, '\\"')}",
  "artist": "${input.artist.replace(/"/g, '\\"')}",
  "publicReadiness": "ready" | "needs_more_research" | "not_ready",
  "bestAngle": "",
  "omitReasons": [],
  "heroNote": "",
  "chapters": [
    {
      "type": "story" | "chart" | "video" | "album" | "artist" | "discovery",
      "title": "",
      "body": "",
      "whyIncluded": "",
      "sourceMaterial": []
    }
  ],
  "discoveryShelves": [
    {
      "title": "",
      "items": [],
      "whyThisShelfMatters": ""
    }
  ],
  "doNotShow": [],
  "missingData": [],
  "qualityNotes": [],
  "recommendedNextResearch": []
}`;
}
