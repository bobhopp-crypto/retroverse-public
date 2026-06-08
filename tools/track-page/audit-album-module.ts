import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { loadTrackPage } from "@/lib/track/load-track-page";

async function auditCover(url: string | null): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

async function auditRoute(url: string, base: string): Promise<{ ok: boolean; status: number | null }> {
  try {
    const res = await fetch(new URL(url, base).href, { redirect: "follow" });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: null };
  }
}

async function auditCase(label: string, id: string, base: string) {
  const data = await loadTrackPage(id);
  if (!data) {
    return { label, id, found: false };
  }

  const trackUrl = `${base}/track/${encodeURIComponent(data.rvtr)}`;
  const albums = await Promise.all(
    data.albums.map(async (album) => ({
      title: album.title,
      href: album.href,
      year: album.releaseYear,
      coverUrl: album.coverUrl,
      coverLoads: await auditCover(album.coverUrl),
      albumRoute: await auditRoute(album.href, base),
    })),
  );

  const artistRoute = await auditRoute(data.artistHref, base);

  return {
    label,
    id,
    found: true,
    rvtr: data.rvtr,
    title: data.title,
    artist: data.artistName,
    trackUrl,
    heroCover: data.coverUrl,
    heroCoverLoads: await auditCover(data.coverUrl),
    albumCount: data.albums.length,
    albums,
    artistHref: data.artistHref,
    artistRoute,
  };
}

async function main() {
  const base = process.env.AUDIT_BASE ?? "http://localhost:3099";
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("DB unavailable:", ping.message);
    process.exit(1);
  }

  const cases: [string, string][] = [
    ["Life In The Fast Lane", "RVTR815712"],
    ["Hotel California", "hotel-california"],
    ["Hello Goodbye", "hello-goodbye"],
  ];

  const multi = await inspectQuery<{ rvtr: string; cnt: string; title: string }>(
    `
    SELECT upper(trim(cat.canonical_track_key)) AS rvtr, count(*)::text AS cnt, max(ct.canonical_title) AS title
    FROM canonical_album_tracks cat
    JOIN canonical_track_display ct ON upper(trim(ct.track_id)) = upper(trim(cat.canonical_track_key))
    GROUP BY upper(trim(cat.canonical_track_key))
    HAVING count(*) >= 2
    ORDER BY count(*) DESC
    LIMIT 1
    `,
  );
  if (multi[0]) cases.push([`Multi-album (${multi[0].title}, ${multi[0].cnt})`, multi[0].rvtr]);

  const none = await inspectQuery<{ rvtr: string; title: string }>(
    `
    SELECT ct.track_id AS rvtr, ct.canonical_title AS title
    FROM canonical_track_display ct
    WHERE ct.has_hot100 = true
      AND NOT EXISTS (
        SELECT 1 FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ct.track_id))
      )
    ORDER BY ct.peak_hot100_position ASC NULLS LAST
    LIMIT 1
    `,
  );
  if (none[0]) cases.push([`No albums (${none[0].title})`, none[0].rvtr]);

  const results = [];
  for (const [label, id] of cases) {
    results.push(await auditCase(label, id, base));
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
