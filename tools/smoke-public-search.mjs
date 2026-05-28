// Lightweight production smoke tests for first-time public users.
// Hits /api/search/suggestions, then verifies the first artist/track/album links render.

const BASE = process.env.RETROVERSE_BASE?.trim() || "https://retroverse.live";
const API_SUGGESTIONS = `${BASE}/api/search/suggestions`;

const QUERIES = [
  "aretha franklin",
  "elton john",
  "madonna",
  "bee gees",
  "fleetwood mac",
  "thriller",
  "stand by me",
  "supremes",
  "donna summer",
  "eagles",
];

function pickFirstHref(items) {
  if (!Array.isArray(items)) return null;
  const it = items.find((x) => typeof x?.href === "string" && x.href.startsWith("/"));
  return it?.href ?? null;
}

function toAbs(href) {
  return href.startsWith("http://") || href.startsWith("https://")
    ? href
    : `${BASE}${href.startsWith("/") ? "" : "/"}${href}`;
}

async function checkPage(href) {
  const url = toAbs(href);
  const res = await fetch(url, { redirect: "manual" });

  // Redirect to home (or anything else) is a hard failure.
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location") ?? "";
    return {
      ok: false,
      status: res.status,
      fromArchive: false,
      redirectLocation: loc,
    };
  }

  const status = res.status;
  if (status !== 200) {
    return { ok: false, status, fromArchive: false, redirectLocation: null };
  }

  const text = await res.text();
  const fromArchive = text.includes("From the archive");
  const blankOrFail = text.trim().length < 2000 || text.includes("Archive index unreachable");

  return {
    ok: status === 200 && fromArchive && !blankOrFail,
    status,
    fromArchive,
    redirectLocation: null,
  };
}

async function getSuggestions(query) {
  const url = `${API_SUGGESTIONS}?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`suggestions HTTP ${res.status}`);
  const data = await res.json();
  return data?.suggestions ?? {};
}

async function runOnePass(query) {
  const suggestions = await getSuggestions(query);
  const artistHref = pickFirstHref(suggestions.artists);
  const trackHref =
    pickFirstHref(suggestions.songs) ?? pickFirstHref(suggestions.tracks) ?? null;
  const albumHref = pickFirstHref(suggestions.albums) ?? null;

  const results = {};
  if (artistHref) results.artist = { href: artistHref, ...(await checkPage(artistHref)) };
  else results.artist = { href: null, ok: true, status: "N/A", fromArchive: false, redirectLocation: null };

  if (trackHref) results.track = { href: trackHref, ...(await checkPage(trackHref)) };
  else results.track = { href: null, ok: true, status: "N/A", fromArchive: false, redirectLocation: null };

  // Album is "if shown": if suggestions.albums is empty, we don't fail the query.
  if (albumHref) results.album = { href: albumHref, ...(await checkPage(albumHref)) };
  else results.album = { href: null, ok: true, status: "N/A", fromArchive: false, redirectLocation: null };

  const ok = results.artist?.ok === true && results.track?.ok === true && (!albumHref || results.album?.ok === true);

  return { query, ok, results, artistHref, trackHref, albumHref };
}

function fmtResult(r) {
  if (r?.status === "N/A") return "skip";
  if (r?.ok) return `OK ${r.status}`;
  if (r?.redirectLocation) return `REDIR ${r.status} -> ${r.redirectLocation}`;
  return `FAIL ${r.status}`;
}

async function checkRvChronologyRedirects() {
  const cases = [
    {
      label: "legacy charts week query",
      url: `${BASE}/charts?year=1967&month=11&week=1967-11-04`,
      expectPath: "/rv/1967/11/1967-11-04",
    },
    {
      label: "legacy charts bare",
      url: `${BASE}/charts`,
      expectPath: "/rv/1978",
    },
  ];

  for (const c of cases) {
    const res = await fetch(c.url, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    const ok =
      (res.status === 307 || res.status === 308 || res.status === 301 || res.status === 302) &&
      loc.includes(c.expectPath);
    console.log(`${ok ? "PASS" : "FAIL"}: chronology redirect — ${c.label}`);
    if (!ok) {
      console.log(`  expected Location containing ${c.expectPath}, got ${res.status} ${loc}`);
    }
    if (!ok) return false;
  }
  return true;
}

async function main() {
  console.log(`Public smoke test (production): ${BASE}`);

  const chronologyOk = await checkRvChronologyRedirects();
  if (!chronologyOk) process.exit(1);

  const rows = [];
  for (const q of QUERIES) {
    // Two passes approximate: "back" + "search again" stability.
    const a = await runOnePass(q);
    const b = await runOnePass(q);
    const ok = a.ok && b.ok;

    rows.push({
      query: q,
      artist: a.results.artist,
      track: a.results.track,
      album: a.results.album,
      repeatOk: ok,
    });

    console.log(`${ok ? "PASS" : "FAIL"}: ${q}`);
    console.log(
      `  artist ${fmtResult(a.results.artist)} | track ${fmtResult(a.results.track)} | album ${fmtResult(
        a.results.album,
      )}`,
    );
  }

  console.log("\nMatrix:");
  const header = ["query", "artist", "track", "album(if shown)", "repeatOk"].join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));
  for (const r of rows) {
    console.log(
      [r.query, fmtResult(r.artist), fmtResult(r.track), fmtResult(r.album), r.repeatOk ? "YES" : "NO"].join(" | "),
    );
  }

  const anyFail = rows.some((r) => !r.repeatOk);
  process.exit(anyFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

