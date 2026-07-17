"use client";

import { useMemo, useState } from "react";
import type { ProductionVideo } from "./load-production-video-data";

export function ProductionCurationStudio({ data }: { data: { generatedAt: string; items: ProductionVideo[] } }) {
  const records = data.items;
  const counts = useMemo(() => {
    const rv = new Map<string, number>(); records.forEach((r) => r.rvtr && rv.set(r.rvtr, (rv.get(r.rvtr) ?? 0) + 1));
    const existing = records.filter((r) => r.exists);
    return { newMedia: existing.filter((r) => !r.rvtr).length, missing: records.filter((r) => !r.exists).length, duplicateRvtr: [...rv.values()].reduce((n, v) => n + Math.max(0, v - 1), 0), duplicateMedia: 0, needsAlbum: existing.filter((r) => !r.album).length, needsYear: existing.filter((r) => !r.year).length, ready: existing.filter((r) => r.rvtr && r.album && r.year).length };
  }, [records]);
  const queues = [["New Media", counts.newMedia], ["Needs RVTR", counts.newMedia], ["Candidate Match", existingCount(records, (r) => r.candidate === "candidate_match")], ["Ready To Assign", 0], ["Needs Research", existingCount(records, (r) => r.candidate === "needs_research")], ["Needs Album", counts.needsAlbum], ["Needs Cover", counts.ready], ["Needs Chart", counts.newMedia], ["Needs Package", existingCount(records, (r) => Boolean(r.rvtr && r.fingerprint.package === "missing"))], ["Needs Discovery", counts.newMedia], ["Needs Navigation", counts.newMedia], ["Ready for ★★★★", 0], ["Ready for ★★★★★", 0], ["Missing Files", counts.missing], ["Duplicate RVTR", counts.duplicateRvtr], ["Duplicate Media", counts.duplicateMedia]] as const;
  const [active, setActive] = useState("New Media");
  const [selected, setSelected] = useState(0);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => records.filter((r) => {
    const match = `${r.filepath} ${r.filename} ${r.artist ?? ""} ${r.title ?? ""} ${r.album ?? ""} ${r.rvtr ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const queueMatch = active === "New Media" || active === "Needs RVTR" ? !r.rvtr : active === "Candidate Match" ? r.candidate === "candidate_match" : active === "Needs Album" ? !r.album : active === "Needs Chart" ? r.fingerprint.chart === "missing" : active === "Needs Package" ? r.fingerprint.package === "missing" : active === "Missing Files" ? !r.exists : active === "Needs Discovery" || active === "Needs Navigation" ? Boolean(r.rvtr) : true;
    return match && queueMatch;
  }), [active, query, records]);
  const item = visible[selected] ?? visible[0] ?? records[0];
  return <main className="production-curation">
    <header className="pc-topbar"><div><span>BOBOS / PRODUCTION OPERATIONS</span><h1>Production Curation Studio</h1><p>MISSION CONTROL · READ-ONLY · /DJ MEDIA/VIDEO/ · scanned {new Date(data.generatedAt).toLocaleString()}</p></div><div className="pc-top-stats"><b>{records.filter((r) => r.exists).length.toLocaleString()} <small>PRODUCTION VIDEOS</small></b><b>{counts.newMedia.toLocaleString()} <small>NEEDS RVTR</small></b><b>{counts.missing.toLocaleString()} <small>MISSING FILES</small></b><b>0 <small>WRITES ENABLED</small></b></div></header>
    <section className="pc-search"><input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setSelected(0); }} placeholder="Search RVTR, artist, song, album, filename, or path…" /><kbd>⌘ K</kbd><button type="button">Scan Production Library</button></section>
    <section className="pc-workspace">
      <aside className="pc-queues"><div className="pc-label">PRODUCTION QUEUES</div>{queues.map(([label, count]) => <button key={label} type="button" className={active === label ? "is-active" : ""} onClick={() => setActive(label)}><span>{label}</span><strong>{count}</strong></button>)}</aside>
      <section className="pc-current"><div className="pc-label">CURRENT PRODUCTION VIDEO</div><div className="pc-hero"><div className="pc-thumb"><span>VIDEO</span><b>{item.album ?? "NO ALBUM"}</b></div><div><div className="pc-stage">{item.rvtr ? "DISCOVERED" : "NEW"} · {item.rvtr ? "IDENTITY PRESENT" : "NEEDS RVTR"}</div><h2>{item.title ?? item.filename}</h2><h3>{item.artist ?? "Artist missing"}</h3><p className="pc-path">{item.filepath}</p><div className="pc-facts"><b>RVTR <span>{item.rvtr ?? "—"}</span></b><b>PUBLIC <span>{item.rvtr ? "Partial" : "Not ready"}</span></b><b>STAR <span>{item.rvtr ? "★★ Imported + identity" : "★ Imported"}</span></b></div></div></div><div className="pc-timeline"><div><b>SCAN</b><span>Last scan {new Date(data.generatedAt).toLocaleString()}</span></div><div><b>FINGERPRINT</b><span>Chart {item.fingerprint.chart} · Artist {item.fingerprint.artist} · Album {item.fingerprint.album} · Package {item.fingerprint.package}</span></div><div><b>HISTORY</b><span>{item.playCount} recorded plays · last played {item.lastPlayed ?? "not recorded"}</span></div></div></section>
      <aside className="pc-candidate"><div className="pc-label">CANDIDATE INFORMATION</div><div className="pc-candidate-card"><div className="pc-candidate-score">{item.rvtr ? "100%" : "—"}<small>LABEL CONFIDENCE</small></div><dl><dt>Suggested RVTR</dt><dd>{item.rvtr ?? "No candidate"}</dd><dt>Primary Artist</dt><dd>{item.artist ?? "Missing"}</dd><dt>Primary Album</dt><dd>{item.album ?? "Missing"}</dd><dt>Chart Evidence</dt><dd>{item.fingerprint.chart}</dd><dt>Package Evidence</dt><dd>{item.fingerprint.package}</dd><dt>Resolver Path</dt><dd>VDJ label → local evidence</dd></dl><div className="pc-warning">{item.rvtr ? "Existing label is evidence only; no write action is available." : "No RVTR label. Candidate matching is not implemented automatically."}</div></div></aside>
    </section>
    <section className="pc-bottom"><div className="pc-new-media"><div className="pc-label">{active.toUpperCase()} · {visible.length} REAL RECORDS</div>{visible.slice(0, 80).map((record, i) => <button key={record.filepath} type="button" className={i === selected ? "is-selected" : ""} onClick={() => setSelected(i)}><span>{record.rvtr ? "LABELED" : "NEEDS RVTR"}</span><b>{record.filename}</b><em>{record.playCount} plays</em></button>)}</div><div className="pc-fingerprint"><div className="pc-label">FINGERPRINT</div>{["Chart", "Artist", "Album", "Performance", "Transition", "Package", "Experience", "Future AI"].map((x) => { const key = x === "Future AI" ? "futureAi" : x.toLowerCase() as keyof ProductionVideo["fingerprint"]; const state = item.fingerprint[key]; return <div className="pc-meter" key={x}><span>{x}</span><i className={state === "complete" ? "complete" : state === "partial" ? "partial" : "missing"}></i><small>{state}</small></div>; })}</div></section>
    <footer className="pc-decision"><span>DECISION BAR · FUTURE ACTIONS · DISABLED</span><button disabled>Assign RVTR</button><button disabled>Approve Match</button><button disabled>Skip</button><button disabled>Ignore</button><button disabled>Open Song</button><button disabled>Open Public Preview</button></footer>
  </main>;
}

function existingCount(items: ProductionVideo[], predicate: (item: ProductionVideo) => boolean) { return items.filter((item) => item.exists && predicate(item)).length; }
