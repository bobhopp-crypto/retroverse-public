import type { VdjPoolSong } from "./types";

export type AssociationSpace = {
  id: string;
  artists: string[];
  titles: string[];
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function haystack(song: VdjPoolSong): string {
  return normalizeText(`${song.artist} ${song.title}`);
}

export function buildAssociationVector(song: VdjPoolSong, spaces: AssociationSpace[]): number[] {
  const text = haystack(song);
  const scores = spaces.map((space) => {
    let score = 0;
    for (const artist of space.artists) {
      const a = normalizeText(artist);
      if (text.includes(a)) score += 4;
    }
    for (const title of space.titles) {
      const t = normalizeText(title);
      if (text.includes(t)) score += 3.5;
    }
    return score;
  });

  const artistKey = normalizeText(song.artist).split(" ").slice(0, 2).join(" ");
  const artistHash = [...artistKey].reduce((n, c) => n + c.charCodeAt(0), 0);
  scores.push((artistHash % 11) * 0.08);

  const sum = scores.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    return scores.map((_, i) => (i === scores.length - 1 ? 1 : 0.01));
  }
  return scores.map((v) => v / sum);
}
