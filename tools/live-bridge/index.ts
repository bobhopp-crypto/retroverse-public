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
import { pickActiveDeck } from "./vdj";
import { findProjectRoot, loadEnvFiles } from "../live/shared";

async function logPostOk(
  dataRoot: string,
  destination: string,
  timestamp: string,
  status: number,
  playing: boolean,
): Promise<void> {
  await bridgeLog(dataRoot, "bridge_post_ok", {
    timestamp,
    destination,
    status,
    playing,
  });
}

async function main() {
  try {
    loadEnvFiles(findProjectRoot());
  } catch {
    /* cwd may already have env from parent spawn */
  }

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
  await bridgeLog(config.dataRoot, "bridge_destination", {
    destination: config.apiUrl,
  });
  console.log(`[live-bridge] POST destination: ${config.apiUrl}`);

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
  let lastPublishedPlaying: boolean | null = null;

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
    const timestamp = new Date().toISOString();
    const tickBase = {
      timestamp,
      artist: null as string | null,
      title: null as string | null,
      filepath: null as string | null,
      deck: null as number | null,
      audible: false,
      crossfader: 50,
      published: false,
      skipReason: null as string | null,
    };

    try {
      await sensor.refreshQueriesAndWait();

      const decks = sensor.getDeckSnapshots(config.deckCount);
      const crossfader = sensor.getCrossfaderResult();
      tickBase.crossfader = crossfader;

      const activeDeck = pickActiveDeck(decks, crossfader, {
        low: config.crossfaderLow,
        high: config.crossfaderHigh,
        lastDeck: lastPickedDeck,
      });

      if (activeDeck) {
        lastPickedDeck = activeDeck.deck;
        tickBase.artist = activeDeck.artist;
        tickBase.title = activeDeck.title;
        tickBase.filepath = activeDeck.filepath;
        tickBase.deck = activeDeck.deck;
        tickBase.audible = activeDeck.audible;
      }

      const anyAudible = decks.some((d) => d.audible);
      const playing = Boolean(activeDeck && (activeDeck.audible || !anyAudible));

      if (lastPublishedPlaying === true && !playing) {
        lastPublishedPlaying = false;
        hysteresis.reset();
        tickBase.skipReason = "playback_stopped";
        await bridgeLog(config.dataRoot, "bridge_tick", tickBase);
        await bridgeLog(config.dataRoot, "playback_stopped", { timestamp, crossfader });
        const result = await publishLiveTrack(config.apiUrl, config.apiSecret, {
          playing: false,
          timestamp,
        });
        if (result.ok) {
          await logPostOk(config.dataRoot, config.apiUrl, timestamp, result.status, false);
        } else {
          await bridgeLog(config.dataRoot, "api_error", {
            status: result.status,
            body: result.body.slice(0, 500),
            event: "playback_stopped",
          });
        }
        return;
      }

      if (!playing) {
        lastPublishedPlaying = false;
        tickBase.skipReason = activeDeck
          ? anyAudible
            ? "deck_not_audible"
            : "no_active_deck"
          : "no_active_deck";
        await bridgeLog(config.dataRoot, "bridge_tick", tickBase);
        return;
      }

      const stable = hysteresis.observe(activeDeck);
      if (!stable) {
        tickBase.skipReason = "awaiting_stable";
        await bridgeLog(config.dataRoot, "bridge_tick", tickBase);
        return;
      }

      lastPublishedPlaying = true;
      await bridgeLog(config.dataRoot, "track_detected", {
        ...stable,
        crossfader,
        playing: true,
        timestamp,
      });

      const result = await publishLiveTrack(config.apiUrl, config.apiSecret, {
        playing: true,
        ...stable,
        timestamp,
      });

      if (!result.ok) {
        tickBase.skipReason = "api_error";
        await bridgeLog(config.dataRoot, "bridge_tick", tickBase);
        await bridgeLog(config.dataRoot, "api_error", {
          status: result.status,
          body: result.body.slice(0, 500),
          filepath: stable.filepath,
          destination: config.apiUrl,
        });
        return;
      }

      await logPostOk(config.dataRoot, config.apiUrl, timestamp, result.status, true);

      tickBase.published = true;
      tickBase.artist = stable.artist;
      tickBase.title = stable.title;
      tickBase.filepath = stable.filepath;
      tickBase.deck = stable.deck;
      await bridgeLog(config.dataRoot, "bridge_tick", tickBase);

      await bridgeLog(config.dataRoot, "track_published", {
        timestamp,
        destination: config.apiUrl,
        artist: stable.artist,
        title: stable.title,
        filepath: stable.filepath,
        deck: stable.deck,
        crossfader,
        playing: true,
        published: true,
        status: result.status,
      });
    } catch (err) {
      tickBase.skipReason = "error";
      await bridgeLog(config.dataRoot, "bridge_tick", tickBase);
      await bridgeLog(config.dataRoot, "vdj_error", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  await tick();
  setInterval(tick, config.pollMs);
}

void main();
