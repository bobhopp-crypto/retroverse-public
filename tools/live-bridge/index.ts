/**
 * VirtualDJ → Retroverse live now playing bridge.
 *
 * Prerequisites:
 *   - VirtualDJ 2023+ Pro with Network Control enabled
 *   - Retroverse API reachable (local dev or production)
 *
 * Usage:
 *   VDJ_NETWORK_PORT=8088 \
 *   LIVE_NOW_PLAYING_URL=http://127.0.0.1:3000/api/sunday-nights/bridge \
 *   LIVE_NOW_PLAYING_SECRET=your-secret \
 *   npx tsx tools/live-bridge/index.ts
 */
import { loadConfig } from "./config";
import { AudibleDeckHysteresis } from "./hysteresis";
import { bridgeLog } from "./logger";
import { publishLiveTrack } from "./publish";
import {
  pickAudibleDeck,
  probeVdj,
  readAllDecks,
  readCrossfaderResult,
} from "./vdj";

async function main() {
  const config = loadConfig();
  const vdj = { port: config.vdjPort, bearer: config.vdjBearer || undefined };
  const hysteresis = new AudibleDeckHysteresis(config.stablePolls);

  await bridgeLog(config.dataRoot, "bridge_start", {
    vdjPort: config.vdjPort,
    apiUrl: config.apiUrl,
    pollMs: config.pollMs,
    stablePolls: config.stablePolls,
  });

  const reachable = await probeVdj(vdj);
  if (!reachable) {
    await bridgeLog(config.dataRoot, "vdj_error", {
      message: "VirtualDJ Network Control not reachable",
      port: config.vdjPort,
    });
    process.exit(1);
  }

  console.log(`Live bridge running — polling VDJ every ${config.pollMs}ms`);

  const tick = async () => {
    try {
      const [decks, crossfader] = await Promise.all([
        readAllDecks(vdj, config.deckCount),
        readCrossfaderResult(vdj),
      ]);

      const audibleDeck = pickAudibleDeck(decks, crossfader);
      const stable = hysteresis.observe(audibleDeck);

      if (!stable) return;

      const timestamp = new Date().toISOString();
      await bridgeLog(config.dataRoot, "track_detected", {
        ...stable,
        timestamp,
      });

      const result = await publishLiveTrack(config.apiUrl, config.apiSecret, {
        ...stable,
        timestamp,
      });

      if (!result.ok) {
        await bridgeLog(config.dataRoot, "api_error", {
          status: result.status,
          body: result.body.slice(0, 500),
          filepath: stable.filepath,
        });
        return;
      }

      await bridgeLog(config.dataRoot, "track_published", {
        filepath: stable.filepath,
        deck: stable.deck,
        status: result.status,
      });
    } catch (err) {
      await bridgeLog(config.dataRoot, "vdj_error", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  await tick();
  setInterval(tick, config.pollMs);
}

void main();
