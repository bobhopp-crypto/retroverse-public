import assert from "node:assert/strict";
import test from "node:test";

import type { RetroverseRuntimeStatus } from "@/lib/bobos/runtime/types";

import { emptyBoothRuntimeHealth, mapBoothRuntimeHealth } from "./runtime-health";

function baseRuntime(overrides: Partial<RetroverseRuntimeStatus> = {}): RetroverseRuntimeStatus {
  const base: RetroverseRuntimeStatus = {
    summary: {
      development: "healthy",
      production: "unknown",
      overallHealth: "healthy",
      startupTimeMs: null,
      lastStartup: null,
      uptimeSeconds: null,
    },
    services: [],
    liveMonitor: {
      local: {
        song: null,
        artist: null,
        rvtr: null,
        updatedAt: null,
        url: "http://127.0.0.1:3100/",
        coverUrl: null,
        destinationKind: null,
        reachable: true,
        error: null,
      },
      public: {
        song: null,
        artist: null,
        rvtr: null,
        updatedAt: null,
        url: "https://retroverse.live/",
        coverUrl: null,
        destinationKind: null,
        reachable: true,
        error: null,
      },
      sync: { inSync: true, label: "IN SYNC", differences: [] },
    },
    deployment: {
      required: false,
      message: "",
      localCommit: null,
      productionCommit: null,
      dirty: false,
    },
    diagnostics: {
      startupLog: [],
      healthFailures: [],
      bridgeReconnectCount: 0,
      oscErrors: 0,
      lastDeploymentTime: null,
      bridgePublicPush: null,
    },
    studio: {
      app: "studio",
      state: "running",
      healthy: true,
      port: 3000,
      url: "http://127.0.0.1:3000",
      owner: null,
      startedAt: null,
      wrapperPid: null,
    },
    live: {
      app: "live",
      state: "running",
      healthy: true,
      port: 3100,
      url: "http://127.0.0.1:3100",
      owner: null,
      startedAt: null,
      wrapperPid: null,
    },
    broadcast: "waiting",
    osc: "connected",
    virtualdj: "connected",
    vdjBridgeRunning: true,
    vdjBridgeCommand: "npm run live-now-playing",
    studioUrl: "http://127.0.0.1:3000",
    liveUrl: "http://127.0.0.1:3100",
    lastStarted: null,
    uptimeSeconds: null,
    checkedAt: "2026-07-21T00:00:00.000Z",
  };
  return { ...base, ...overrides };
}

test("empty health never fakes green", () => {
  const health = emptyBoothRuntimeHealth();
  assert.equal(health.lamps.runtime, "unknown");
  assert.equal(health.lamps.vdjConnected, "unknown");
  assert.equal(health.lamps.vdjPlaying, "unknown");
  assert.equal(health.lamps.audience, "unknown");
  assert.equal(health.localConfidence, "Unknown");
  assert.equal(health.publicConfidence, "Unknown");
});

test("healthy runtime lights RUNTIME and Bridge", () => {
  const health = mapBoothRuntimeHealth({ runtime: baseRuntime() });
  assert.equal(health.lamps.runtime, "on");
  assert.equal(health.lamps.vdjConnected, "on");
  assert.equal(health.monitors.find((row) => row.id === "bridge")?.value, "Connected");
});

test("down runtime is offline — not on", () => {
  const health = mapBoothRuntimeHealth({
    runtime: baseRuntime({
      summary: {
        development: "down",
        production: "unknown",
        overallHealth: "down",
        startupTimeMs: null,
        lastStartup: null,
        uptimeSeconds: null,
      },
    }),
  });
  assert.equal(health.lamps.runtime, "offline");
});

test("bridge down is disconnected", () => {
  const health = mapBoothRuntimeHealth({
    runtime: baseRuntime({
      vdjBridgeRunning: false,
      virtualdj: "waiting",
      osc: "waiting",
    }),
  });
  assert.equal(health.lamps.vdjConnected, "disconnected");
  assert.equal(health.lamps.vdjPlaying, "unknown");
});

test("audience synced → Confirmed; unreachable → Offline", () => {
  const synced = mapBoothRuntimeHealth({
    runtime: baseRuntime(),
    broadcast: {
      vdjPlaying: true,
      publicSync: "synced",
      publicSyncDetail: "ok",
    },
  });
  assert.equal(synced.lamps.audience, "on");
  assert.equal(synced.publicConfidence, "Confirmed");
  assert.equal(synced.lamps.vdjPlaying, "on");

  const unreachable = mapBoothRuntimeHealth({
    runtime: baseRuntime(),
    broadcast: {
      vdjPlaying: false,
      publicSync: "unreachable",
      publicSyncDetail: "timeout",
    },
  });
  assert.equal(unreachable.lamps.audience, "disconnected");
  assert.equal(unreachable.publicConfidence, "Offline");
  assert.equal(unreachable.lamps.vdjPlaying, "off");
});

test("unconfigured audience stays Unknown — never green", () => {
  const health = mapBoothRuntimeHealth({
    runtime: baseRuntime(),
    broadcast: {
      vdjPlaying: false,
      publicSync: "unconfigured",
      publicSyncDetail: "secret missing",
    },
  });
  assert.equal(health.lamps.audience, "unknown");
  assert.equal(health.publicConfidence, "Unknown");
});
