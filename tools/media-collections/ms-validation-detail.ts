/**
 * Supplemental failure analysis for MS validation.
 */
import { writeFile } from "fs/promises";
import { join } from "path";

import { parseEpisodeTitle } from "@/lib/ops/media-collections/parse-episode-title";
import { generateCandidateManifest, parseArtistSong } from "@/lib/ops/media-collections/midnight-special/parse-performances";
import { parseYearFromAirDate } from "@/lib/ops/media-collections/midnight-special/timecode";
import { listEpisodes } from "@/lib/ops/media-collections/state";

async function main() {
  const episodes = (await listEpisodes("midnight_special")).filter(
    (e) => e.downloaded || e.status === "downloaded",
  );

  const noChapters: { id: string; title: string }[] = [];
  const failTitles = new Map<string, number>();

  for (const ep of episodes) {
    const m = await generateCandidateManifest(ep.id);
    if (!m) {
      noChapters.push({ id: ep.id, title: ep.title });
      continue;
    }
    for (const p of m.performances) {
      if (!parseArtistSong(p.chapter_title)) {
        failTitles.set(p.chapter_title, (failTitles.get(p.chapter_title) ?? 0) + 1);
      }
    }
  }

  const yearCounts = new Map<number, number>();
  for (const ep of episodes) {
    const { air_date } = parseEpisodeTitle(ep.title);
    const y = parseYearFromAirDate(air_date ?? ep.air_date) ?? 0;
    yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
  }

  const topFails = [...failTitles.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const out = {
    year_distribution: Object.fromEntries([...yearCounts.entries()].sort((a, b) => a[0] - b[0])),
    no_chapters: noChapters,
    top_failed_chapter_titles: topFails.map(([title, count]) => ({ title, count })),
  };

  const path = join(
    process.cwd(),
    "reports/media-collections/midnight-special-validation-detail.json",
  );
  await writeFile(path, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(out, null, 2));
}

main();
