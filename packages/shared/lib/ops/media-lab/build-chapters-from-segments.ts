/**
 * Content-aware chapters from Whisper segments (TV retrospectives, bumpers, commercials).
 */

export type TranscriptSegment = { start: number; end: number; text: string };

export type ContentChapter = {
  start: number;
  end: number;
  title: string;
  kind: "show" | "commercial" | "network" | "topic" | "intro";
};

/** Canonical display titles (longest / most specific first). */
const SHOW_LEXICON: { match: RegExp; title: string }[] = [
  { match: /\blost\s+in\s+space\b/i, title: "Lost In Space" },
  { match: /\bman\s+from\s+u\.?\s*n\.?\s*c\.?\s*l\.?\s*e\.?\b/i, title: "Man From U.N.C.L.E." },
  { match: /\bthe\s+monkees\b/i, title: "The Monkees" },
  { match: /\bmonkees\b/i, title: "The Monkees" },
  { match: /\bgreen\s+hornet\b/i, title: "Green Hornet" },
  { match: /\bbeverly\s+hillbillies\b/i, title: "Beverly Hillbillies" },
  { match: /\bthe\s+invaders\b/i, title: "The Invaders" },
  { match: /\binvaders\b/i, title: "The Invaders" },
  { match: /\bgreen\s+acres\b/i, title: "Green Acres" },
  { match: /\bbig\s+valley\b/i, title: "Big Valley" },
  { match: /\bfugitive\s+finale\b/i, title: "Fugitive Finale" },
  { match: /\bthe\s+fugitive\b/i, title: "The Fugitive" },
  { match: /\bbatman\b/i, title: "Batman" },
  { match: /\bstar\s+trek\b/i, title: "Star Trek" },
  { match: /\bmission\s*:\s*impossible\b/i, title: "Mission: Impossible" },
  { match: /\bthe\s+twilight\s+zone\b/i, title: "Twilight Zone" },
  { match: /\bget\s+smart\b/i, title: "Get Smart" },
  { match: /\bi\s+dream\s+of\s+jeannie\b/i, title: "I Dream of Jeannie" },
  { match: /\bbewitched\b/i, title: "Bewitched" },
  { match: /\bthe\s+mod\s+squad\b/i, title: "The Mod Squad" },
  { match: /\bpartridge\s+family\b/i, title: "Partridge Family" },
  { match: /\bbrady\s+bunch\b/i, title: "Brady Bunch" },
  { match: /\bhogan'?s\s+heroes\b/i, title: "Hogan's Heroes" },
  { match: /\bmunsters\b/i, title: "The Munsters" },
  { match: /\baddams\s+family\b/i, title: "Addams Family" },
  { match: /\bflipper\b/i, title: "Flipper" },
  { match: /\bgilligan'?s?\s+island\b/i, title: "Gilligan's Island" },
  { match: /\bwild\s+wild\s+west\b/i, title: "The Wild Wild West" },
  { match: /\bjetsons\b/i, title: "The Jetsons" },
  { match: /\bflintstones\b/i, title: "The Flintstones" },
];

const NETWORK_RE =
  /\b(NBC|CBS|ABC|BBC|UPN|FOX)\b|network\s+identification|station\s+identification|we(?:'ll| will)\s+return|stay\s+tuned|after\s+these\s+messages/i;

const COMMERCIAL_RE =
  /\b(commercial|sponsor(?:ed)?|brought\s+to\s+you|advertisement|and\s+now\s+a\s+word|don't\s+miss|now\s+available|cleanser|toothpaste|detergent|breakfast\s+cereal|soap\b)\b/i;

const BRAND_RE =
  /\b(coca[\s-]?cola|pepsi|chevrolet|ford|general\s+motors|procter|gamble|kellogg|campbell|gillette|colgate|maxwell\s+house|jell[\s-]?o|wonder\s+bread)\b/i;

const DISNEY_RE = /\bdisney\b|walt\s+disney/i;

const FINALE_RE = /\bfinale\b|\bfinal\s+episode\b|\bseries\s+finale\b/i;

const TITLE_CASE_RE =
  /\b(?:The\s+)?[A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|U\.N\.C\.L\.E\.)){0,4}\b/g;

const STOP_TITLE_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "our",
  "now",
  "next",
  "here",
  "there",
  "welcome",
  "hello",
  "today",
  "tonight",
  "television",
  "program",
  "show",
  "series",
  "episode",
  "season",
  "classic",
  "tv",
  "american",
  "history",
  "ladies",
  "gentlemen",
]);

type Marker = {
  start: number;
  title: string;
  kind: ContentChapter["kind"];
  strength: number;
};

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function windowText(segments: TranscriptSegment[], index: number, radius = 2): string {
  const lo = Math.max(0, index - radius);
  const hi = Math.min(segments.length - 1, index + radius);
  return normalizeText(segments.slice(lo, hi + 1).map((s) => s.text).join(" "));
}

function detectShow(text: string): string | null {
  const intro = text.match(
    /(?:coming\s+up|up\s+next|now\s+on|featuring|presenting|followed\s+by)\s*,?\s*(.+)$/i,
  );
  if (intro?.[1]) {
    const introText = intro[1].replace(/^the\s+/i, "").trim();
    for (const { match, title } of SHOW_LEXICON) {
      if (match.test(introText)) return title;
    }
    const candidate = cleanTitleCandidate(introText);
    if (candidate) return candidate;
  }

  if (FINALE_RE.test(text)) {
    for (const { match, title } of SHOW_LEXICON) {
      if (match.test(text) && /fugitive/i.test(title)) return "Fugitive Finale";
    }
    const m = text.match(/\bthe\s+([a-z\s]+?)\s+finale\b/i);
    if (m?.[1]) return `${titleCaseWords(m[1].trim())} Finale`;
    return "Finale";
  }

  for (const { match, title } of SHOW_LEXICON) {
    if (match.test(text)) return title;
  }

  return extractTitleCasePhrases(text)[0] ?? null;
}

function hasLexiconShow(text: string): boolean {
  return SHOW_LEXICON.some(({ match }) => match.test(text));
}

function detectShowAtSegment(segments: TranscriptSegment[], index: number): string | null {
  const center = segments[index]?.text ?? "";
  if (isCommercial(center) && !hasLexiconShow(center)) return null;
  return detectShow(center);
}

function extractTitleCasePhrases(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(TITLE_CASE_RE)) {
    const candidate = cleanTitleCandidate(m[0]);
    if (candidate && candidate.length >= 4) found.push(candidate);
  }
  return found;
}

function cleanTitleCandidate(raw: string): string | null {
  const t = normalizeText(raw.replace(/^the\s+/i, "").replace(/[,.!?]+$/, ""));
  const words = t.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 2 && !/^batman|bewitched|flipper$/i.test(t)) return null;
  if (words.map((w) => w.toLowerCase()).every((w) => STOP_TITLE_WORDS.has(w))) return null;
  return titleCaseWords(t);
}

function titleCaseWords(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => {
      if (/^U\.N\.C\.L\.E\.$/i.test(w)) return "U.N.C.L.E.";
      if (w.length <= 3 && w === w.toUpperCase()) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function detectNetwork(text: string): string | null {
  if (!NETWORK_RE.test(text)) return null;
  const net = text.match(/\b(NBC|CBS|ABC|BBC|FOX|UPN)\b/i);
  return net ? `Network — ${net[1].toUpperCase()}` : "Network ID";
}

function isCommercial(text: string): boolean {
  return COMMERCIAL_RE.test(text) || BRAND_RE.test(text);
}

function topicSignature(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_TITLE_WORDS.has(w));
  return new Set(words.slice(0, 14));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

function formatOpeningTitle(show: string, text: string): string {
  if (DISNEY_RE.test(text) && !show.toLowerCase().includes("disney")) {
    return `Disney / ${show}`;
  }
  return show;
}

function commercialTitle(text: string): string {
  if (/\bsponsor/i.test(text) || BRAND_RE.test(text)) return "Commercial Sponsors";
  return "Commercial Sponsors";
}

function collectShowMarkers(segments: TranscriptSegment[]): Marker[] {
  const markers: Marker[] = [];
  let lastTitle = "";
  let lastAt = -999;

  for (let i = 0; i < segments.length; i++) {
    const show = detectShowAtSegment(segments, i);
    if (!show) continue;

    const start = segments[i].start;
    if (show === lastTitle && start - lastAt < 45) continue;

    const title =
      markers.length === 0
        ? formatOpeningTitle(show, windowText(segments, i, 3))
        : show;

    markers.push({ start, title, kind: "show", strength: 3 });
    lastTitle = show;
    lastAt = start;
  }

  return markers;
}

function collectCommercialMarkers(segments: TranscriptSegment[]): Marker[] {
  const markers: Marker[] = [];
  const windowSize = 4;
  const minHits = 2;

  for (let i = 0; i < segments.length; i++) {
    const slice = segments.slice(i, Math.min(segments.length, i + windowSize));
    const hits = slice.filter((s) => isCommercial(s.text));
    if (hits.length < minHits) continue;

    const start = hits[0].start;
    const text = hits.map((s) => s.text).join(" ");
    const prev = markers[markers.length - 1];
    if (prev && prev.kind === "commercial" && start - prev.start < 45) continue;

    markers.push({
      start,
      title: commercialTitle(text),
      kind: "commercial",
      strength: 2,
    });
    i += Math.max(1, hits.length - 1);
  }

  return markers;
}

function collectNetworkMarkers(segments: TranscriptSegment[]): Marker[] {
  const markers: Marker[] = [];
  for (let i = 0; i < segments.length; i++) {
    const text = windowText(segments, i, 1);
    const network = detectNetwork(text);
    if (!network) continue;
    markers.push({ start: segments[i].start, title: network, kind: "network", strength: 2 });
    i += 3;
  }
  return markers;
}

function collectTopicMarkers(segments: TranscriptSegment[]): Marker[] {
  const markers: Marker[] = [];
  let prevTopic = topicSignature(windowText(segments, 0, 2));
  let lastAt = segments[0]?.start ?? 0;

  for (let i = 1; i < segments.length; i++) {
    const text = windowText(segments, i, 2);
    const topic = topicSignature(text);
    const start = segments[i].start;
    if (start - lastAt < 25) continue;
    if (jaccard(prevTopic, topic) >= 0.22) {
      prevTopic = topic;
      continue;
    }

    const title = extractTitleCasePhrases(text)[0];
    if (!title) {
      prevTopic = topic;
      continue;
    }

    markers.push({ start, title, kind: "topic", strength: 1 });
    prevTopic = topic;
    lastAt = start;
  }

  return markers;
}

function dedupeMarkers(markers: Marker[]): Marker[] {
  const sorted = [...markers].sort((a, b) => a.start - b.start || b.strength - a.strength);
  const out: Marker[] = [];

  for (const m of sorted) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push(m);
      continue;
    }
    if (m.title === prev.title && m.start - prev.start < 8) continue;
    if (m.start - prev.start < 4 && m.strength <= prev.strength) continue;
    if (prev.kind === "commercial" && m.kind === "commercial" && m.start - prev.start < 90) continue;
    out.push(m);
  }

  return out;
}

function markersToChapters(markers: Marker[], videoEnd: number, firstStart: number): ContentChapter[] {
  if (markers.length === 0) {
    return [{ start: firstStart, end: videoEnd, title: "Program start", kind: "intro" }];
  }

  const chapters: ContentChapter[] = markers.map((m, idx) => ({
    start: m.start,
    end: markers[idx + 1]?.start ?? videoEnd,
    title: m.title,
    kind: m.kind,
  }));

  chapters[0].start = firstStart;
  chapters[chapters.length - 1].end = videoEnd;

  return mergeShortChapters(chapters, 6);
}

function mergeShortChapters(chapters: ContentChapter[], minSec: number): ContentChapter[] {
  if (chapters.length <= 1) return chapters;

  const out: ContentChapter[] = [];
  for (const ch of chapters) {
    const dur = ch.end - ch.start;
    const prev = out[out.length - 1];
    if (prev && dur < minSec && ch.kind !== "show" && prev.kind !== "commercial") {
      prev.end = ch.end;
      continue;
    }
    if (prev && ch.title === prev.title) {
      prev.end = ch.end;
      continue;
    }
    out.push({ ...ch });
  }
  return out;
}

export function buildContentAwareChapters(segments: TranscriptSegment[]): ContentChapter[] {
  if (segments.length === 0) {
    return [{ start: 0, end: 0, title: "Full video", kind: "intro" }];
  }

  const videoEnd = segments[segments.length - 1].end;
  const firstStart = segments[0].start;

  const markers = dedupeMarkers([
    ...collectShowMarkers(segments),
    ...collectCommercialMarkers(segments),
    ...collectNetworkMarkers(segments),
    ...collectTopicMarkers(segments),
  ]);

  return markersToChapters(markers, videoEnd, firstStart);
}
