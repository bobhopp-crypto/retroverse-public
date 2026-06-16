import { createSocket, type Socket } from "dgram";

import {
  decodeOscPacket,
  encodeOscMessage,
  vdjQueryPath,
  vdjScriptToOscPath,
  type OscMessage,
} from "./osc-minimal";
import type { VdjDeckSnapshot } from "./vdj";

export type OscSensorConfig = {
  host: string;
  vdjPort: number;
  listenPort: number;
};

type FieldKey =
  | "d1_filepath"
  | "d1_artist"
  | "d1_title"
  | "d2_filepath"
  | "d2_artist"
  | "d2_title"
  | "crossfader"
  | "clock";

const FIELD_QUERIES: { key: FieldKey; script: string; force?: "text" }[] = [
  { key: "clock", script: "get_clock" },
  { key: "d1_filepath", script: "deck 1 get_filepath", force: "text" },
  { key: "d1_artist", script: "deck 1 get_artist", force: "text" },
  { key: "d1_title", script: "deck 1 get_title", force: "text" },
  { key: "d2_filepath", script: "deck 2 get_filepath", force: "text" },
  { key: "d2_artist", script: "deck 2 get_artist", force: "text" },
  { key: "d2_title", script: "deck 2 get_title", force: "text" },
  { key: "crossfader", script: "get_crossfader_result" },
];

const SUBSCRIBE_SCRIPTS = [
  "deck 1 get_filepath",
  "deck 1 get_artist",
  "deck 1 get_title",
  "deck 2 get_filepath",
  "deck 2 get_artist",
  "deck 2 get_title",
  "get_crossfader_result",
];

function matchField(address: string): FieldKey | null {
  const a = address.toLowerCase();
  if (a.includes("/get_clock")) return "clock";
  if (a.includes("/deck/1/") && a.includes("get_filepath")) return "d1_filepath";
  if (a.includes("/deck/1/") && a.includes("get_artist")) return "d1_artist";
  if (a.includes("/deck/1/") && a.includes("get_title")) return "d1_title";
  if (a.includes("/deck/2/") && a.includes("get_filepath")) return "d2_filepath";
  if (a.includes("/deck/2/") && a.includes("get_artist")) return "d2_artist";
  if (a.includes("/deck/2/") && a.includes("get_title")) return "d2_title";
  if (a.includes("get_crossfader_result")) return "crossfader";
  return null;
}

function formatArg(v: OscMessage["args"][number]): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function parseCrossfader(raw: string): number {
  const n = Number(raw.trim());
  if (!Number.isFinite(n)) return 50;
  if (n >= 0 && n <= 1) return n * 100;
  return n;
}

type CacheEntry = {
  value: string;
  updatedAt: number;
};

export class VdjOscSensor {
  private sock: Socket | null = null;
  private readonly cache = new Map<FieldKey, CacheEntry>();
  private lastDeckFieldUpdate: string | null = null;

  constructor(private readonly config: OscSensorConfig) {}

  get lastDeckUpdateAt(): string | null {
    return this.lastDeckFieldUpdate;
  }

  async start(): Promise<boolean> {
    await new Promise<void>((resolve, reject) => {
      const sock = createSocket("udp4");
      sock.on("error", reject);
      sock.on("message", (msg) => this.onMessage(msg));
      sock.bind(this.config.listenPort, "127.0.0.1", () => {
        this.sock = sock;
        resolve();
      });
    });

    for (const script of SUBSCRIBE_SCRIPTS) {
      this.send(vdjScriptToOscPath("subscribe", script));
      await sleep(40);
    }
    await this.refreshQueries();
    return true;
  }

  stop(): void {
    this.sock?.close();
    this.sock = null;
  }

  async refreshQueries(): Promise<void> {
    for (const q of FIELD_QUERIES) {
      this.send(vdjQueryPath(q.script, q.force));
      await sleep(60);
    }
  }

  getDeckSnapshots(deckCount: number): VdjDeckSnapshot[] {
    const decks: VdjDeckSnapshot[] = [];
    for (let deck = 1; deck <= deckCount; deck += 1) {
      const prefix = deck === 1 ? "d1" : "d2";
      decks.push({
        deck,
        filepath: this.cache.get(`${prefix}_filepath` as FieldKey)?.value ?? "",
        artist: this.cache.get(`${prefix}_artist` as FieldKey)?.value ?? "",
        title: this.cache.get(`${prefix}_title` as FieldKey)?.value ?? "",
        audible: false,
        elapsedMs: 0,
      });
    }
    return decks;
  }

  getCrossfaderResult(): number {
    const raw = this.cache.get("crossfader")?.value ?? "50";
    return parseCrossfader(raw);
  }

  hasDeckData(): boolean {
    return (
      Boolean(this.cache.get("d1_filepath")?.value.trim()) ||
      Boolean(this.cache.get("d2_filepath")?.value.trim())
    );
  }

  private onMessage(msg: Buffer): void {
    for (const pkt of decodeOscPacket(msg)) {
      const key = matchField(pkt.address);
      if (!key) continue;

      let val = pkt.args.map(formatArg).filter(Boolean).join(" ");
      if (!val && (pkt.args[0] === true || pkt.args[0] === false)) {
        val = pkt.args[0] ? "true" : "false";
      }
      if (!val && key !== "clock") continue;

      const now = new Date().toISOString();
      this.cache.set(key, { value: val, updatedAt: Date.now() });

      if (key.startsWith("d1_") || key.startsWith("d2_") || key === "crossfader") {
        this.lastDeckFieldUpdate = now;
      }
    }
  }

  private send(address: string): void {
    if (!this.sock) return;
    const pkt = encodeOscMessage(address);
    this.sock.send(pkt, this.config.vdjPort, this.config.host);
  }
}

/** One-shot OSC connectivity probe — send get_clock, wait for reply. */
export async function probeOscConnectivity(
  config: OscSensorConfig,
  timeoutMs = 2500,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        sock.close();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };

    const sock = createSocket("udp4");
    const timer = setTimeout(() => finish(false), timeoutMs);

    sock.on("error", () => finish(false));
    sock.on("message", (msg) => {
      for (const pkt of decodeOscPacket(msg)) {
        if (matchField(pkt.address) === "clock") {
          finish(true);
          return;
        }
      }
    });

    sock.bind(config.listenPort, "127.0.0.1", () => {
      const pkt = encodeOscMessage(vdjQueryPath("get_clock"));
      sock.send(pkt, config.vdjPort, config.host);
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
