/**
 * Smoke test live channel rotation without HTTP ops auth.
 * Usage: npx tsx tools/verify-live-channel.ts
 */
import { startLiveChannel, stopLiveChannel, maybeAdvanceLiveChannel } from "@/lib/live-control/engine";
import { loadLiveControlState } from "@/lib/live-control/state";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

async function main() {
  await stopLiveChannel().catch(() => null);

  const started = await startLiveChannel({
    mode: "demo",
    contentSource: "year",
    year: 1971,
    readyOnly: true,
    order: "random",
    durationSeconds: 30,
  });
  console.log("started queue:", started.queueRvtrs.length, "first:", started.queueRvtrs[0]);

  const live = await loadSundayNightsState();
  console.log("live rvtr:", live.currentTrackId, live.live?.title);

  const control = await loadLiveControlState();
  if (!control.running || !live.currentTrackId) {
    throw new Error("channel did not publish a track");
  }

  await stopLiveChannel();
  console.log("OK: live channel start/stop works");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
