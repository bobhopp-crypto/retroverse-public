/**
 * Read MP4 container tags via ffprobe (same fields VirtualDJ reads on scan).
 * Usage: npx tsx tools/media-lab/probe-mp4-metadata.ts <path.mp4>
 */
import { spawnSync } from "node:child_process";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx tools/media-lab/probe-mp4-metadata.ts <path.mp4>");
  process.exit(1);
}

const result = spawnSync(
  "ffprobe",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-show_entries",
    "format_tags=artist,title,genre,album,grouping,date,year,comment,description",
    "-of",
    "json",
    filePath,
  ],
  { encoding: "utf8" },
);

if (result.status !== 0) {
  console.error(result.stderr || "ffprobe failed");
  process.exit(result.status ?? 1);
}

const parsed = JSON.parse(result.stdout) as { format?: { tags?: Record<string, string> } };
const tags = parsed.format?.tags ?? {};

console.log(
  JSON.stringify(
    {
      filePath,
      tags,
      vdjMapping: {
        Author: tags.artist ?? tags.ARTIST ?? null,
        Title: tags.title ?? tags.TITLE ?? null,
        Genre: tags.genre ?? tags.GENRE ?? null,
        Album: tags.album ?? tags.ALBUM ?? null,
        Grouping: tags.grouping ?? tags.GROUPING ?? tags.album ?? null,
        Year: tags.year ?? tags.date ?? tags.YEAR ?? tags.DATE ?? null,
        User2: tags.comment ?? tags.description ?? null,
      },
    },
    null,
    2,
  ),
);
