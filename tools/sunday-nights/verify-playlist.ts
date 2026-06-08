import { inspectPing } from "@/lib/inspect/pg";
import { loadYearPool } from "@/lib/ops/show-builder/parse-vdjfolder";
import { scanVdjFolderLists } from "@/lib/ops/show-builder/scan-my-lists";
import { loadSundayPlaylist } from "@/lib/sunday-nights/load-playlist";
import { setCurrentTrackId } from "@/lib/sunday-nights/state";

async function main() {
  const ping = await inspectPing();
  console.log("Postgres:", ping.ok ? "ok" : ping.error ?? "offline");

  const lists = await scanVdjFolderLists();
  console.log(
    "Playlists:",
    lists.map((l) => l.label).join(", "),
  );

  const pool = await loadYearPool(1967);
  console.log("1967.vdjfolder songs:", pool.length);

  const payload = await loadSundayPlaylist("1967");
  console.log("1967 event songs:", payload.songs.length);
  const withRvtr = payload.songs.filter((s) => s.rvtr);
  console.log("With RVTR:", withRvtr.length);
  if (withRvtr[0]) {
    console.log("Sample:", withRvtr[0].artist, "—", withRvtr[0].title, "→", withRvtr[0].rvtr);
    const state = await setCurrentTrackId(withRvtr[0].rvtr);
    console.log("State updated:", state.currentTrackId);
  } else if (payload.songs[0]) {
    console.log("First song (no RVTR):", payload.songs[0].title);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
