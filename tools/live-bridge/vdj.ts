export type VdjDeckSnapshot = {
  deck: number;
  filepath: string;
  artist: string;
  title: string;
  audible: boolean;
  elapsedMs: number;
};

export type VdjClientOptions = {
  port: string;
  bearer?: string;
};

function baseUrl(port: string): string {
  return `http://127.0.0.1:${port}`;
}

async function query(
  opts: VdjClientOptions,
  script: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = `${baseUrl(opts.port)}/query?script=${encodeURIComponent(script)}`;
  const headers: Record<string, string> = {};
  if (opts.bearer) headers.Authorization = `Bearer ${opts.bearer}`;

  try {
    const res = await fetch(url, { headers });
    const body = (await res.text()).trim();
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

function parseBool(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "on" || v === "1" || v === "yes";
}

function parseNumber(raw: string): number {
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : 0;
}

export async function probeVdj(opts: VdjClientOptions): Promise<boolean> {
  const r = await query(opts, "get_clock");
  return r.ok && r.status === 200 && r.body.length > 0;
}

export async function readCrossfaderResult(opts: VdjClientOptions): Promise<number> {
  const r = await query(opts, "get_crossfader_result");
  if (!r.ok) return 50;
  return parseNumber(r.body);
}

export async function readDeckSnapshot(
  opts: VdjClientOptions,
  deck: number,
): Promise<VdjDeckSnapshot> {
  const [filepathR, artistR, titleR, audibleR, elapsedR] = await Promise.all([
    query(opts, `deck ${deck} get_filepath`),
    query(opts, `deck ${deck} get_artist`),
    query(opts, `deck ${deck} get_title`),
    query(opts, `deck ${deck} is_audible`),
    query(opts, `deck ${deck} get_time elapsed`),
  ]);

  return {
    deck,
    filepath: filepathR.body,
    artist: artistR.body,
    title: titleR.body,
    audible: parseBool(audibleR.body),
    elapsedMs: parseNumber(elapsedR.body),
  };
}

export async function readAllDecks(
  opts: VdjClientOptions,
  deckCount: number,
): Promise<VdjDeckSnapshot[]> {
  const decks = Array.from({ length: deckCount }, (_, i) => i + 1);
  return Promise.all(decks.map((deck) => readDeckSnapshot(opts, deck)));
}

export function pickAudibleDeck(
  decks: VdjDeckSnapshot[],
  crossfaderResult: number,
): VdjDeckSnapshot | null {
  const audible = decks.filter((d) => d.audible && d.filepath.trim());
  if (audible.length === 0) return null;
  if (audible.length === 1) return audible[0]!;

  const leftDeck = decks[0];
  const rightDeck = decks[1];
  if (leftDeck && rightDeck) {
    if (crossfaderResult <= 50 && leftDeck.audible && leftDeck.filepath.trim()) {
      return leftDeck;
    }
    if (crossfaderResult > 50 && rightDeck.audible && rightDeck.filepath.trim()) {
      return rightDeck;
    }
  }

  return audible.sort((a, b) => b.elapsedMs - a.elapsedMs)[0] ?? null;
}
