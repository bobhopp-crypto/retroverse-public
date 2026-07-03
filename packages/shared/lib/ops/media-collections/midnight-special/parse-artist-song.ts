export type ParseMethod =
  | "dash"
  | "quoted"
  | "performs"
  | "medley"
  | "song_only_quoted"
  | "song_only"
  | "feat"
  | "ampersand";

export type ParseConfidence = "high" | "medium" | "low";

export type ArtistSongParse = {
  artist: string;
  song: string;
  method: ParseMethod;
  confidence: ParseConfidence;
};

export function parseArtistSong(title: string): { artist: string; song: string } | null {
  const t = title.trim();
  const dash = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) {
    return { artist: dash[1]!.trim(), song: dash[2]!.trim() };
  }
  return null;
}

function stripQuotes(text: string): string {
  return text.replace(/^["']|["']$/g, "").trim();
}

function looksLikeSongTitle(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  if (/^(intro|outro|host|commercial|intermission|credits?)\b/i.test(t)) return false;
  return true;
}

/** Second-pass chapter title parsing for review classification and enrichment. */
export function parseArtistSongSecondPass(title: string): ArtistSongParse | null {
  const t = title.trim();
  if (!t) return null;

  const dash = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) {
    return {
      artist: dash[1]!.trim(),
      song: stripQuotes(dash[2]!.trim()),
      method: "dash",
      confidence: "high",
    };
  }

  const tightDash = t.match(/^(.+?)[–—-]\s*(.+)$/);
  if (tightDash && tightDash[1]!.length >= 2 && tightDash[2]!.length >= 2) {
    return {
      artist: tightDash[1]!.trim(),
      song: stripQuotes(tightDash[2]!.trim()),
      method: "dash",
      confidence: "high",
    };
  }

  const quoted = t.match(/^(.+?)\s+["'](.+?)["']\s*$/);
  if (quoted) {
    return {
      artist: quoted[1]!.trim(),
      song: quoted[2]!.trim(),
      method: "quoted",
      confidence: "high",
    };
  }

  const performs = t.match(/^(.+?)\s+(?:performs?|performing|sings?|singing|plays?|playing)\s+(.+)$/i);
  if (performs) {
    return {
      artist: performs[1]!.trim(),
      song: stripQuotes(performs[2]!.trim()),
      method: "performs",
      confidence: "high",
    };
  }

  if (/\bmedley\b/i.test(t)) {
    const medleyDash = t.match(/^(.+?)\s+[-–—]\s+(.+medley.*)$/i);
    if (medleyDash) {
      return {
        artist: medleyDash[1]!.trim(),
        song: medleyDash[2]!.trim(),
        method: "medley",
        confidence: "medium",
      };
    }
    const medleySpace = t.match(/^(.+?)\s+(.+medley.*)$/i);
    if (medleySpace && medleySpace[1]!.length >= 2) {
      return {
        artist: medleySpace[1]!.trim(),
        song: medleySpace[2]!.trim(),
        method: "medley",
        confidence: "medium",
      };
    }
  }

  const songOnlyQuoted = t.match(/^["'](.+?)["']$/);
  if (songOnlyQuoted && looksLikeSongTitle(songOnlyQuoted[1]!)) {
    return {
      artist: "",
      song: songOnlyQuoted[1]!.trim(),
      method: "song_only_quoted",
      confidence: "medium",
    };
  }

  const feat = t.match(/^(.+?)\s+(?:feat\.?|featuring|ft\.?)\s+(.+)$/i);
  if (feat) {
    return {
      artist: feat[1]!.trim(),
      song: stripQuotes(feat[2]!.trim()),
      method: "feat",
      confidence: "medium",
    };
  }

  if (/\s&\s/.test(t) || /\sand\s/i.test(t)) {
    const words = t.split(/\s+/);
    if (words.length >= 3 && words.length <= 8) {
      const mid = Math.ceil(words.length / 2);
      const artist = words.slice(0, mid).join(" ");
      const song = words.slice(mid).join(" ");
      if (artist.length >= 2 && looksLikeSongTitle(song)) {
        return {
          artist,
          song,
          method: "ampersand",
          confidence: "low",
        };
      }
    }
  }

  if (looksLikeSongTitle(t) && !/\b(comedy|interview|clip|commercial|intro|dialogue)\b/i.test(t)) {
    const words = t.split(/\s+/);
    if (words.length >= 3 && words.length <= 8) {
      const mid = Math.max(1, Math.floor(words.length / 2));
      const artist = words.slice(0, mid).join(" ");
      const song = words.slice(mid).join(" ");
      if (artist.length >= 2 && song.length >= 2) {
        return {
          artist,
          song,
          method: "song_only",
          confidence: "low",
        };
      }
    }
    if (words.length >= 2) {
      return {
        artist: "",
        song: t,
        method: "song_only",
        confidence: "medium",
      };
    }
  }

  return null;
}

export function parseConfidenceSupportsMusic(parse: ArtistSongParse): boolean {
  if (parse.confidence === "high") return true;
  if (parse.confidence === "medium") {
    if (parse.method === "song_only_quoted") return parse.song.length >= 3;
    return Boolean(parse.artist && parse.song);
  }
  return Boolean(parse.artist && parse.song && parse.artist.length >= 2 && parse.song.length >= 3);
}
