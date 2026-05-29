#!/usr/bin/env node
/**
 * One-off pilot: merge RVTags from CSV into VirtualDJ database.xml User2 only.
 * Usage: node tools/write-rvtags-pilot.mjs [--write]
 */
import fs from "fs";
import path from "path";

const CSV_PATH =
  "/Users/bobhopp/RETROVERSE_PUBLIC/docs/ops/1967-vdj-rvtags-pilot.csv";
const DB_DIR = "/Users/bobhopp/Library/Application Support/VirtualDJ";
const DB_PATH = path.join(DB_DIR, "database.xml");
const BACKUP_NAME = "database_before_rvtags_pilot.xml";
const BACKUP_PATH = path.join(DB_DIR, BACKUP_NAME);

const EDITORIAL = new Set([
  "#BritishInvasion",
  "#Motown",
  "#Soul",
  "#Psychedelic",
  "#GarageRock",
  "#SummerOfLove",
  "#TVFavorite",
  "#Novelty",
  "#OneHitWonder",
  "#DeepCut",
]);

const GENERIC_DROP_ORDER = [
  "#CrowdFavorite",
  "#PartyStarter",
  "#DanceFloor",
  "#SingAlong",
  "#SlowDance",
];

function normPath(p) {
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\/g, "/")
    .trim();
}

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = [];
    let cur = "";
    let inQ = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
        if (inQ && line[j + 1] === '"') {
          cur += '"';
          j++;
        } else inQ = !inQ;
      } else if (c === "," && !inQ) {
        parts.push(cur);
        cur = "";
      } else cur += c;
    }
    parts.push(cur);
    if (parts.length < 5) continue;
    rows.push({
      filePath: parts[0],
      artist: parts[1],
      title: parts[2],
      year: parts[3],
      rvTags: parts[4].trim(),
    });
  }
  return rows;
}

function parseHashtags(s) {
  if (!s?.trim()) return [];
  return [...new Set(s.trim().split(/\s+/).filter((t) => t.startsWith("#")))];
}

function sanitizeTags(tags, playCount) {
  let t = [...tags];
  if (t.includes("#CrowdFavorite") && playCount < 2) {
    const hasEditorial = t.some((x) => EDITORIAL.has(x));
    if (hasEditorial || t.length > 3) {
      t = t.filter((x) => x !== "#CrowdFavorite");
    }
  }
  while (t.length > 4) {
    const drop = GENERIC_DROP_ORDER.find((g) => t.includes(g));
    if (!drop) break;
    t = t.filter((x) => x !== drop);
  }
  if (t.length > 5) {
    for (const g of GENERIC_DROP_ORDER) {
      if (t.length <= 5) break;
      if (t.includes(g)) t = t.filter((x) => x !== g);
    }
  }
  return t;
}

function mergeUser2(existing, incoming) {
  const merged = [...parseHashtags(existing)];
  for (const tag of incoming) {
    if (!merged.includes(tag)) merged.push(tag);
  }
  return merged.join(" ");
}

function xmlEscapeAttr(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function indexDatabase(xml) {
  const songs = new Map();
  const songRe =
    /<Song FilePath="([^"]*)"[^>]*>\s*<Tags([^>]*?)(\s*\/>)/g;
  let m;
  while ((m = songRe.exec(xml)) !== null) {
    const xmlFilePath = m[1];
    const filePath = normPath(xmlFilePath);
    const tagsAttrs = m[2];
    const user2M = tagsAttrs.match(/\sUser2="([^"]*)"/);
    const playM = xml
      .slice(m.index, m.index + 800)
      .match(/<Infos[^>]*PlayCount="(\d+)"/);
    songs.set(filePath, {
      xmlFilePath,
      filePath,
      existingUser2: user2M
        ? user2M[1]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&")
        : "",
      playCount: playM ? Number(playM[1]) : 0,
      matchIndex: m.index,
      tagsAttrs,
      fullMatch: m[0],
    });
  }
  return songs;
}

function updateTagsAttrs(tagsAttrs, newUser2) {
  const val = xmlEscapeAttr(newUser2);
  if (/\sUser2="[^"]*"/.test(tagsAttrs)) {
    return tagsAttrs.replace(/\sUser2="[^"]*"/, ` User2="${val}"`);
  }
  return `${tagsAttrs} User2="${val}"`;
}

function main() {
  const doWrite = process.argv.includes("--write");

  if (!fs.existsSync(CSV_PATH)) {
    console.error("CSV missing:", CSV_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(DB_PATH)) {
    console.error("database.xml missing:", DB_PATH);
    process.exit(1);
  }

  const manualBackupZip = path.join(DB_DIR, "database 2.xml.zip");
  const manualOk = fs.existsSync(manualBackupZip);
  console.log("=== MANUAL BACKUP CHECK ===");
  console.log(
    manualOk
      ? `OK: found ${manualBackupZip} (2026-05-28, contains database.xml)`
      : "WARN: no database 2.xml.zip found — confirm Bob backup before write",
  );

  const csvRows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const xml = fs.readFileSync(DB_PATH, "utf8");
  const songs = indexDatabase(xml);

  const updates = [];
  const unmatched = [];
  const skipped = [];

  for (const row of csvRows) {
    const key = normPath(row.filePath);
    const song = songs.get(key);
    if (!song) {
      unmatched.push(row);
      continue;
    }
    const incoming = sanitizeTags(parseHashtags(row.rvTags), song.playCount);
    const merged = mergeUser2(song.existingUser2, incoming);
    if (!merged && !song.existingUser2) {
      skipped.push({ row, reason: "empty after sanitize" });
      continue;
    }
    if (merged === song.existingUser2) {
      skipped.push({ row, reason: "no change" });
      continue;
    }
    updates.push({
      row,
      song,
      incoming,
      merged,
      before: song.existingUser2 || "(empty)",
    });
  }

  const tagFreq = {};
  for (const u of updates) {
    for (const t of parseHashtags(u.merged)) {
      tagFreq[t] = (tagFreq[t] || 0) + 1;
    }
  }
  const top10 = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log("\n=== PRE-WRITE REVIEW ===");
  console.log("CSV rows:", csvRows.length);
  console.log("VDJ songs indexed:", songs.size);
  console.log("CSV matched in VDJ:", csvRows.length - unmatched.length);
  console.log("Unmatched CSV paths:", unmatched.length);
  console.log("Will update User2:", updates.length);
  console.log("Skipped:", skipped.length);
  console.log("\nTop 10 hashtags (post-merge, post-sanitize):");
  for (const [t, c] of top10) console.log(`  ${c}\t${t}`);

  if (unmatched.length) {
    console.log("\nUnmatched (first 10):");
    unmatched.slice(0, 10).forEach((r) => console.log(" ", r.filePath));
  }

  const examples = updates.slice(0, 3);
  console.log("\nExample merges (first 3 updates):");
  for (const ex of examples) {
    console.log(" Path:", ex.row.filePath);
    console.log(" Before:", ex.before);
    console.log(" CSV sanitized:", ex.incoming.join(" "));
    console.log(" After:", ex.merged);
  }

  if (!doWrite) {
    console.log("\n(dry run — pass --write to apply)");
    return;
  }

  if (!manualOk) {
    console.error("\nABORT: manual backup not verified.");
    process.exit(1);
  }

  console.log("\n=== BACKUP ===");
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    const st = fs.statSync(BACKUP_PATH);
    if (st.size < 1_000_000) {
      console.error("ABORT: backup too small");
      process.exit(1);
    }
    console.log("Wrote", BACKUP_PATH, `(${st.size} bytes)`);
  } else {
    console.log("Using existing", BACKUP_PATH);
  }

  let out = fs.readFileSync(BACKUP_PATH, "utf8");
  const byIndex = [...updates].sort((a, b) => b.song.matchIndex - a.song.matchIndex);
  for (const u of byIndex) {
    const esc = u.song.xmlFilePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `(<Song FilePath="${esc}"[^>]*>\\s*<Tags)([^>]*?)(\\s*\\/>)`,
    );
    const newTags = updateTagsAttrs(u.song.tagsAttrs, u.merged);
    const before = out;
    out = out.replace(re, (_, open, _attrs, close) => `${open}${newTags}${close}`);
    if (out === before) {
      console.error("REPLACE FAILED:", u.row.filePath);
      process.exit(1);
    }
  }

  fs.writeFileSync(DB_PATH, out, "utf8");
  console.log("\n=== WRITE COMPLETE ===");
  console.log("Tracks updated:", updates.length);
  console.log("Tracks skipped:", skipped.length);
  console.log("Tracks unmatched:", unmatched.length);

  console.log("\n=== AFTER WRITE (XML snippets) ===");
  const verify = fs.readFileSync(DB_PATH, "utf8");
  for (const ex of examples) {
    const esc = ex.song.xmlFilePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `<Song FilePath="${esc}"[^>]*>\\s*<Tags[^>]*>`,
    );
    const vm = verify.match(re);
    console.log("\n", ex.row.title, ":", vm ? vm[0].slice(0, 200) + "..." : "NOT FOUND");
  }
}

main();
