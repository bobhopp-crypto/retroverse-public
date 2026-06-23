import type { FactCategory, StoryHookType } from "./song-package-types";

export type HeadlineTemplate = {
  id: string;
  hookType: StoryHookType;
  categories: FactCategory[];
  build: (factText: string) => string;
};

function slotFromFact(factText: string, maxWords = 4): string {
  const words = factText.replace(/[.!?]+$/, "").split(/\s+/).slice(0, maxWords);
  return words.join(" ");
}

export const HEADLINE_TEMPLATES: HeadlineTemplate[] = [
  {
    id: "trivia_origin",
    hookType: "question",
    categories: ["trivia"],
    build: (fact) => {
      const m = fact.match(/called (?:Paul )?(?:Simon )?["']([^"']+)["']/i);
      if (m?.[1]) return `Where Did "${m[1]}" Come From?`;
      const ref = fact.match(/referred to Paul as "([^"]+)"/i);
      if (ref?.[1]) return `Where Did "${ref[1]}" Come From?`;
      return "Where Did That Name Come From?";
    },
  },
  {
    id: "video_story",
    hookType: "video",
    categories: ["video"],
    build: (fact) => {
      if (/Chevy Chase/i.test(fact)) return "The Chevy Chase Music Video";
      if (/Saturday Night Live|SNL/i.test(fact)) return "The Original SNL Video";
      return "The Music Video Story";
    },
  },
  {
    id: "recording_trick",
    hookType: "recording",
    categories: ["recording"],
    build: (fact) => {
      if (/reversed/i.test(fact)) return "The Reversed Tape Trick";
      if (/Adrian Belew/i.test(fact)) return "The Saxophone That Wasn't";
      return "How They Recorded It";
    },
  },
  {
    id: "chart_peak",
    hookType: "chart",
    categories: ["chart"],
    build: (fact) => {
      const m = fact.match(/#\s*(\d+)/);
      if (m) return `Chart Peak: #${m[1]}`;
      return "How High Did It Chart?";
    },
  },
  {
    id: "quote_critic",
    hookType: "quote",
    categories: ["quote"],
    build: (fact) => {
      const m = fact.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/);
      if (m) return `${m[1]} on This Song`;
      return "What Critics Said";
    },
  },
  {
    id: "album_context",
    hookType: "surprise",
    categories: ["album"],
    build: (fact) => {
      const m = fact.match(/album "([^"]+)"/i);
      if (m?.[1]) return `From the Album "${m[1]}"`;
      if (/Grammy/i.test(fact)) return "The Grammy-Winning Album";
      return "Album Context";
    },
  },
  {
    id: "cultural_impact",
    hookType: "surprise",
    categories: ["cultural_impact", "tv_film"],
    build: () => "Still Showing Up in Pop Culture",
  },
  {
    id: "performance",
    hookType: "surprise",
    categories: ["performance"],
    build: () => "A Memorable Performance",
  },
  {
    id: "artist_context",
    hookType: "surprise",
    categories: ["artist"],
    build: () => "About the Artist",
  },
  {
    id: "generic_fact",
    hookType: "question",
    categories: ["trivia", "recording", "video", "chart", "quote", "album", "cultural_impact", "tv_film", "performance", "artist"],
    build: (fact) => slotFromFact(fact, 5),
  },
];

export function pickHeadlineTemplate(category: FactCategory, factText: string): HeadlineTemplate {
  const specific = HEADLINE_TEMPLATES.filter(
    (t) => t.id !== "generic_fact" && t.categories.includes(category),
  );
  for (const t of specific) {
    const headline = t.build(factText);
    if (headline && headline.length <= 60) return t;
  }
  return HEADLINE_TEMPLATES.find((t) => t.id === "generic_fact")!;
}
