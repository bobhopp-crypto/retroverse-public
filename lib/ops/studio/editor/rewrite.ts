import "server-only";

import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";

import { attachEditorialReview } from "./editorial-review";
import { attachNarrativeBlueprint } from "./narrative-blueprint";
import { storyAngleLabel } from "./editorial-constants";
import type {
  CandidateFactReview,
  EditorStoryNarrative,
  EditorStoryPackage,
  StoryAngleId,
} from "./types";

const ENCYCLOPEDIA =
  /is performed by|retroverse track|canonical cover|virtualdj library|owned media file|appears on the album/i;

const ANGLE_FRAMES: Record<StoryAngleId, { headline: string; hook: string; lead: string }> = {
  breakthrough: {
    headline: "The Breakthrough Moment",
    hook: "This was the song that changed everything.",
    lead: "Sometimes a single track redraws the map — this one broke through when it mattered most.",
  },
  personal_story: {
    headline: "The Personal Story Behind the Song",
    hook: "Behind the melody lies a chapter someone needed to get out.",
    lead: "The best pop songs smuggle private truth into public airwaves — this one did it without flinching.",
  },
  cultural_moment: {
    headline: "A Cultural Moment Captured on Record",
    hook: "The song arrived when the culture was ready to hear it.",
    lead: "Great records do not just chart — they stamp a moment in time people still recognize decades later.",
  },
  technical_innovation: {
    headline: "When the Sound Changed",
    hook: "Something in the booth had never quite been done this way before.",
    lead: "Studio choices that seemed small on the session tape became part of how everyone else made records afterward.",
  },
  live_performance: {
    headline: "The Performance That Defined It",
    hook: "On stage, the song became something the record alone could not contain.",
    lead: "Live, the arrangement breathes differently — and this cut captures the night it clicked.",
  },
  career_turning_point: {
    headline: "The Turning Point",
    hook: "Before and after this song, the story looked different.",
    lead: "Careers pivot on records that rewrite the contract between artist and audience — this is one of those pivots.",
  },
  behind_the_scenes: {
    headline: "Behind the Scenes",
    hook: "The making of the song is almost as good as the song.",
    lead: "Session stories, last-minute fixes, and happy accidents often explain why a track feels alive.",
  },
  unexpected_connection: {
    headline: "An Unexpected Connection",
    hook: "The most surprising stories are the true ones.",
    lead: "Follow the thread and this song connects to places, people, and moments you might not assume at first listen.",
  },
  custom: {
    headline: "The Story",
    hook: "Every great song has a story worth telling.",
    lead: "The editorial team selected the facts that matter most for this narrative.",
  },
};

function acceptedFacts(story: EditorStoryPackage): CandidateFactReview[] {
  return story.workspace.candidateFacts.filter((f) => f.status === "accepted");
}

function angleForStory(story: EditorStoryPackage): StoryAngleId {
  return story.meta.storyAngle ?? "cultural_moment";
}

function pickFactLine(facts: CandidateFactReview[], index: number): string | null {
  const fact = facts[index];
  if (!fact) return null;
  const line = fact.text.trim();
  if (ENCYCLOPEDIA.test(line)) return null;
  return line.endsWith(".") ? line : `${line}.`;
}

function memorableLead(
  pkg: CollectorPackage,
  facts: CandidateFactReview[],
  frame: (typeof ANGLE_FRAMES)[StoryAngleId],
): string {
  const seed = pkg.storySeed?.whyItMatters?.trim();
  if (seed && seed.length >= 40 && !ENCYCLOPEDIA.test(seed)) {
    return seed;
  }
  for (const fact of facts) {
    if (ENCYCLOPEDIA.test(fact.text)) continue;
    if (fact.text.length >= 50) return fact.text;
  }
  return frame.lead;
}

function buildNarrativeRules(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
  facts: CandidateFactReview[],
): EditorStoryNarrative {
  const angle = angleForStory(story);
  const frame = ANGLE_FRAMES[angle];
  const customLabel = storyAngleLabel(angle, story.meta.storyAngleCustom);
  const { artist, title } = pkg;
  const year = pkg.identity.year;

  const headline =
    angle === "custom" && story.meta.storyAngleCustom
      ? `${title} — ${story.meta.storyAngleCustom}`
      : `${title}: ${frame.headline}`;

  const subtitle =
    year != null ? `${artist} · ${customLabel} · ${year}` : `${artist} · ${customLabel}`;

  const hookLine = pickFactLine(facts, 0);
  const hook =
    (hookLine ? hookLine.split(/[.!?]/)[0]?.trim() + "." : null) ||
    (pkg.storySeed?.strongestFacts[0]
      ? `${pkg.storySeed.strongestFacts[0].split(/[.!?]/)[0]?.trim()}.`
      : null) ||
    frame.hook;

  const summaryParts = [
    memorableLead(pkg, facts, frame),
    pickFactLine(facts, 1),
  ].filter(Boolean);

  const paragraphs: string[] = [];
  paragraphs.push(memorableLead(pkg, facts, frame));

  for (const fact of facts) {
    if (ENCYCLOPEDIA.test(fact.text)) continue;
    if (paragraphs.some((p) => p.includes(fact.text.slice(0, 35)))) continue;
    paragraphs.push(fact.text.endsWith(".") ? fact.text : `${fact.text}.`);
    if (paragraphs.length >= 4) break;
  }

  if (pkg.charts.peakHot100 != null && paragraphs.length < 5) {
    const chartLine =
      pkg.charts.peakHot100 <= 10
        ? `It landed in the national spotlight — a top-ten moment on the Hot 100 that still defines how people remember ${year ?? "that year"}.`
        : `Chart success put it in millions of ears; the peak at #${pkg.charts.peakHot100} was only the beginning of its afterlife.`;
    if (!paragraphs.some((p) => /hot 100|chart/i.test(p))) paragraphs.push(chartLine);
  }

  const takeaway =
    pkg.storySeed?.storyIdeas[0] ??
    `Years later, "${title}" still rewards a closer listen — not just as a track, but as a story ${artist} never quite stopped telling.`;
  if (!paragraphs.some((p) => p.includes(takeaway.slice(0, 30)))) {
    paragraphs.push(takeaway.endsWith(".") ? takeaway : `${takeaway}.`);
  }

  return {
    headline,
    subtitle,
    hook,
    summary: summaryParts.slice(0, 2).join(" "),
    fullStory: paragraphs.slice(0, 5).join("\n\n"),
  };
}

async function buildNarrativeOpenAI(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
  facts: CandidateFactReview[],
): Promise<EditorStoryNarrative | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const angle = storyAngleLabel(angleForStory(story), story.meta.storyAngleCustom);
  const usableFacts = facts
    .filter((f) => !ENCYCLOPEDIA.test(f.text))
    .map((f) => `- ${f.text}`)
    .join("\n");
  const seed = pkg.storySeed;

  const prompt = `You are a feature writer for a great music magazine (Rolling Stone, MOJO, Pitchfork long-read).

Write a story patrons will read while the song plays — engaging, human, memorable.

Artist: ${pkg.artist}
Title: ${pkg.title}
Story Angle: ${angle}

Prioritize:
- memorable moments and human stories
- recording/session color when available
- unusual or surprising facts
- cultural impact and historical context
- light humor when the material supports it

Reduce or avoid:
- track listings and label credits
- repetitive chart statistics
- encyclopedia tone ("is performed by", "appears on the album")
- metadata, file paths, database language

Answer for the reader:
- Why is this song important?
- Why do people still remember it?
- What surprised me?
- What would I tell someone else?

Use ONLY these accepted facts (do not invent):
${usableFacts || "- Minimal facts — write a short compelling sketch without inventing details."}

${seed?.whyItMatters ? `Editorial seed: ${seed.whyItMatters}` : ""}
${seed?.storyIdeas?.length ? `Story ideas: ${seed.storyIdeas.join("; ")}` : ""}

Return JSON: headline, subtitle, hook (one gripping sentence), summary (2 sentences), fullStory (3-5 short paragraphs, magazine voice).`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You write vivid music journalism. Valid JSON only. No Wikipedia tone.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.75,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as EditorStoryNarrative;
    if (!parsed.headline || !parsed.fullStory) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type RewriteResult = {
  story: EditorStoryPackage;
  usedAi: boolean;
};

/** Rewrite narrative from accepted facts + story angle. */
export async function rewriteStoryFromAcceptedFacts(
  pkg: CollectorPackage,
  story: EditorStoryPackage,
): Promise<RewriteResult> {
  const facts = acceptedFacts(story);
  const synced = {
    ...story,
    approved: {
      ...story.approved,
      facts: facts.slice(0, 7).map((f) => ({
        id: f.id,
        text: f.text,
        sourceRef: f.sourceRef,
      })),
    },
  };

  const aiNarrative = await buildNarrativeOpenAI(pkg, synced, facts);
  const narrative = aiNarrative ?? buildNarrativeRules(pkg, synced, facts);

  const rewritten: EditorStoryPackage = {
    ...synced,
    story: narrative,
    meta: {
      ...synced.meta,
      lastRewriteAt: new Date().toISOString(),
      storyManuallyEdited: false,
      editorialStatus:
        synced.meta.editorialStatus === "submitted" ? "submitted" : "in_progress",
    },
  };

  return {
    usedAi: aiNarrative != null,
    story: attachNarrativeBlueprint(pkg, attachEditorialReview(pkg, rewritten)),
  };
}

export function setCandidateFactStatus(
  story: EditorStoryPackage,
  factId: string,
  status: CandidateFactReview["status"],
): EditorStoryPackage {
  const candidateFacts = story.workspace.candidateFacts.map((f) =>
    f.id === factId ? { ...f, status } : f,
  );

  const accepted = candidateFacts.filter((f) => f.status === "accepted");

  return {
    ...story,
    workspace: { ...story.workspace, candidateFacts },
    approved: {
      ...story.approved,
      facts: accepted.slice(0, 7).map((f) => ({
        id: f.id,
        text: f.text,
        sourceRef: f.sourceRef,
      })),
    },
  };
}
