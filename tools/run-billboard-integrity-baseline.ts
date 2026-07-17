import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectPing, inspectQuery, getInspectPool } from "../packages/shared/lib/inspect/pg";

type Row = { rvtr: string; title: string | null; artist: string | null; artists: string[]; albums: string[]; release_year: number | null; chart_rows: number; rep_week: string | null; duplicate_identity_count: number; };
const root = process.cwd();
const out = join(root, "reports/billboard-integrity");
const csv = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
const header = ["rvtr","title","artist","artists","albums","release_year","chart_rows","representative_week","duplicate_identity_count","status","priority","issues"].join(",");

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) throw new Error(`Postgres unavailable: ${ping.error ?? "unknown error"}`);
  await mkdir(out, { recursive: true });
  const rows = await inspectQuery<Row>(`
    WITH hot AS (
      SELECT ctd.track_id::text AS rvtr, ctd.canonical_title AS title,
             ctd.canonical_artist_name AS display_artist, ctd.artist_id,
             ctd.first_chart_date::text AS first_chart_date
      FROM canonical_track_display ctd WHERE ctd.has_hot100 IS TRUE
    ), chart AS (
      SELECT ct.id AS canonical_track_id, count(*)::int AS n,
             min(ca.chart_date)::text AS rep_week
      FROM canonical_tracks ct JOIN chart_appearances ca ON ca.track_id = ct.graph_track_id
      WHERE ca.chart_name ~* 'Billboard[[:space:]]+Hot[[:space:]]*100'
      GROUP BY ct.id
    ), rel AS (
      SELECT cat.canonical_track_key,
             array_agg(DISTINCT ar.canonical_name ORDER BY ar.canonical_name) FILTER (WHERE ar.id IS NOT NULL) AS artists,
             array_agg(DISTINCT al.title ORDER BY al.title) FILTER (WHERE al.id IS NOT NULL) AS albums,
             min(al.release_year)::int AS release_year
      FROM canonical_tracks ct
      LEFT JOIN canonical_album_tracks cat ON upper(trim(cat.canonical_track_key)) = upper(trim(ct.track_id::text))
      LEFT JOIN albums al ON al.id = cat.album_id
      LEFT JOIN artists ar ON ar.id = al.artist_id
      GROUP BY cat.canonical_track_key
    ), dup AS (
      SELECT upper(trim(coalesce(ctd.canonical_title,''))) || '|' || upper(trim(coalesce(ctd.canonical_artist_name,''))) AS identity_key,
             count(DISTINCT ctd.track_id)::int AS n
      FROM canonical_track_display ctd WHERE ctd.has_hot100 IS TRUE
      GROUP BY 1
    )
    SELECT h.rvtr, h.title, h.display_artist AS artist,
           coalesce(r.artists, ARRAY[]::text[]) AS artists,
           coalesce(r.albums, ARRAY[]::text[]) AS albums,
           r.release_year, coalesce(ch.n,0)::int AS chart_rows,
           coalesce(ch.rep_week, h.first_chart_date) AS rep_week,
           coalesce(d.n,1)::int AS duplicate_identity_count
    FROM hot h
    JOIN canonical_tracks ct ON upper(trim(ct.track_id::text)) = upper(trim(h.rvtr))
    LEFT JOIN chart ch ON ch.canonical_track_id = ct.id
    LEFT JOIN rel r ON upper(trim(r.canonical_track_key)) = upper(trim(ct.track_id::text))
    LEFT JOIN dup d ON d.identity_key = upper(trim(coalesce(h.title,''))) || '|' || upper(trim(coalesce(h.display_artist,'')))
    ORDER BY h.rvtr`, []);
  const classified = rows.map(r => {
    const issues: string[] = [];
    if (!r.artist || r.artists.length !== 1) issues.push("missing_or_multiple_artist");
    if (r.albums.length === 0) issues.push("missing_album");
    if (r.albums.length > 1) issues.push("multiple_albums");
    if (r.release_year == null) issues.push("missing_release_year");
    if (r.chart_rows === 0) issues.push("missing_chart_history");
    if (!r.rep_week) issues.push("missing_representative_week");
    if (r.duplicate_identity_count > 1) issues.push("duplicate_billboard_identity");
    const status = r.duplicate_identity_count > 1 ? "DUPLICATE" : r.albums.length > 1 || r.artists.length > 1 ? "AMBIGUOUS" : issues.length ? "INCOMPLETE" : "VALID";
    const weights: Record<string, number> = { missing_or_multiple_artist: 100, missing_chart_history: 90, multiple_albums: 70, duplicate_billboard_identity: 60, missing_representative_week: 40, missing_release_year: 30, missing_album: 80 };
    const priority = issues.reduce((n, i) => Math.max(n, weights[i] ?? 10), 0);
    return { ...r, status, priority, issues: issues.join(";") };
  });
  const line = (r: typeof classified[number]) => [r.rvtr,r.title,r.artist,r.artists.join(" | "),r.albums.join(" | "),r.release_year,r.chart_rows,r.rep_week,r.duplicate_identity_count,r.status,r.priority,r.issues].map(csv).join(",");
  const writeRows = async (name: string, rs: typeof classified) => writeFile(join(out,name), [header,...rs.map(line),""].join("\n"));
  await Promise.all([
    writeRows("billboard-integrity.csv", classified),
    writeRows("billboard-invalid.csv", classified.filter(r => r.status === "INVALID")),
    writeRows("billboard-ambiguous.csv", classified.filter(r => r.status === "AMBIGUOUS")),
    writeRows("billboard-incomplete.csv", classified.filter(r => r.status === "INCOMPLETE")),
    writeRows("billboard-duplicates.csv", classified.filter(r => r.status === "DUPLICATE")),
    writeRows("billboard-top-100.csv", [...classified].filter(r => r.status !== "VALID").sort((a,b) => b.priority-a.priority || a.rvtr.localeCompare(b.rvtr)).slice(0,100)),
  ]);
  const counts = Object.fromEntries(["VALID","INCOMPLETE","AMBIGUOUS","INVALID","DUPLICATE"].map(s => [s, classified.filter(r => r.status === s).length]));
  const pct = (n: number) => classified.length ? `${(n / classified.length * 100).toFixed(2)}%` : "0.00%";
  const summary = `# Billboard Canonical Integrity Baseline\n\nScanned: ${new Date().toISOString()}\n\n| Metric | Count | Percent |\n|---|---:|---:|\n| Total RVTR | ${classified.length} | 100.00% |\n${Object.entries(counts).map(([k,v]) => `| ${k} | ${v} | ${pct(v as number)} |`).join("\n")}\n\nSpecial reports are CSV files in this directory. This audit was read-only; no database writes, repairs, updates, enrichment, artwork, matching, or application changes were performed.\n`;
  await writeFile(join(out,"billboard-integrity-summary.md"), summary);
  const snap = join(out,"snapshots/snapshot-001"); await mkdir(snap,{recursive:true});
  const files = ["billboard-integrity-summary.md","billboard-integrity.csv","billboard-invalid.csv","billboard-ambiguous.csv","billboard-incomplete.csv","billboard-duplicates.csv","billboard-top-100.csv"];
  for (const f of files) { const data = await (await import("node:fs/promises")).readFile(join(out,f)); await writeFile(join(snap,f),data); }
  const manifest = files.map(f => { const data = require("node:fs").readFileSync(join(snap,f)); return `${createHash("sha256").update(data).digest("hex")}  ${f}`; }).join("\n")+"\n";
  await writeFile(join(snap,"MANIFEST.sha256"),manifest);
  console.log(JSON.stringify({ total: classified.length, counts, out }, null, 2));
  await getInspectPool().end();
}
main().catch(e => { console.error(e); process.exit(1); });
