/**
 * Canonical Retroverse service registry — single source of truth for
 * ports, health checks, and marker suffixes.
 *
 * Used by:
 *  - tools/dev-server/runtime-control.mjs (RV 01-02 Runtime, start/stop/restart)
 *  - tools/retroverse/launch.ts (RV 00-00 Retroverse, cold-start orchestrator)
 *  - packages/shared/lib/bobos/runtime/dev-control.ts (RV 01-02 status/UI)
 *    imports the same JSON directly — see tools/dev-server/service-registry.json.
 *
 * Do not duplicate ports/health URLs/commands elsewhere — edit
 * service-registry.json and everything above picks it up.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const registryPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "service-registry.json",
);

let cached = null;

export function loadServiceRegistry() {
  if (!cached) {
    cached = JSON.parse(readFileSync(registryPath, "utf8"));
  }
  return cached;
}

export function listServices() {
  return Object.values(loadServiceRegistry());
}

export function getService(id) {
  return loadServiceRegistry()[id] ?? null;
}

/** Build the health-check URL for a service, or null if it has no HTTP health check. */
export function healthUrlFor(id, host = "127.0.0.1") {
  const svc = getService(id);
  if (!svc || svc.port == null || svc.healthPath == null) return null;
  return `http://${host}:${svc.port}${svc.healthPath}`;
}
