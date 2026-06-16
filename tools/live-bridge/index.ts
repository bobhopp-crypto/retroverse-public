/**
 * VirtualDJ OSC → Retroverse live now playing bridge.
 *
 * Prerequisites:
 *   - VirtualDJ Pro with OSC enabled (oscPort / oscPortBack)
 *   - Retroverse API reachable (local dev or production)
 *
 * Usage:
 *   VDJ_OSC_PORT=9000 VDJ_OSC_BACK_PORT=9001 \
 *   LIVE_NOW_PLAYING_URL=http://127.0.0.1:3000/api/sunday-nights/bridge \
 *   LIVE_NOW_PLAYING_SECRET=your-secret \
 *   npx tsx tools/live-bridge/index.ts
 */
import { loadConfig } from "./config";
import { AudibleDeckHysteresis } from "./hysteresis";
import { bridgeLog } from "./logger";
import { VdjOscSensor } from "./osc-sensor";
import { publishLiveTrack } from "./publish";
import { pickCrossfaderDeck } from "./vdj";

async function main() {
  const config = loadConfig();
  const hysteresis = new AudibleDeckHysteresis(config.stablePolls);
  const sensor = new VdjOscSensor({
    host: config.oscHost,
    vdjPort: config.oscPort,
    listenPort: config.oscPortBack,
  });

  await bridgeLog(config.dataRoot, "bridge_start", {
    oscHost: config.oscHost,
    oscPort: config.oscPort,
    oscPortBack: config.oscPortBack,
    apiUrl: config.apiUrl,
    pollMs: config.pollMs,
    stablePolls: config.stablePolls,
    crossfaderLow: config.crossfaderLow,
    crossfaderHigh: config.crossfaderHigh,
  });

  const reachable = await sensor.start();
  if (!reachable) {
    sensor.stop();
    await bridgeLog(config.dataRoot, "vdj_error", {
      message: "VirtualDJ OSC not reachable",
      oscPort: config.oscPort,
      oscPortBack: config.oscPortBack,
    });
    process.exit(1);
  }

  let lastPickedDeck: number | null = null;

  console.log(
    `Live bridge running — OSC ${config.oscHost}:${config.oscPort} → listen :${config.oscPortBack} every ${config.pollMs}ms`,
  );

  const shutdown = () => {
    sensor.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const tick = async () => {
    try {
      await sensor.refreshQueries();
      await sleep(200);

      const decks = sensor.getDeckSnapshots(config.deckCount);
      const crossfader = sensor.getCrossfaderResult();
      const activeDeck = pickCrossfaderDeck(decks, crossfader, {
        low: config.crossfaderLow,
        high: config.crossfaderHigh,
        lastDeck: lastPickedDeck,
      });

      if (activeDeck) {
        lastPickedDeck = activeDeck.deck;
      }

      const stable = hysteresis.observe(activeDeck);
      if (!stable) return;

      const timestamp = new Date().toISOString();
      await bridgeLog(config.dataRoot, "track_detected", {
        ...stable,
        crossfader,
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
        crossfader,
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

void main();
