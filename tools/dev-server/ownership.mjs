/**
 * Dev server ownership — prevents background tools from killing foreign npm run dev.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MARKER_SUFFIX = process.env.RETROVERSE_DEV_MARKER_SUFFIX?.trim() ?? "";
export const DEV_MARKER = path.join(
  process.cwd(),
  `.retroverse-dev-active${MARKER_SUFFIX}`,
);
export const EVENTS_LOG = path.join(process.cwd(), "reports/dev-server/DEV_SERVER_EVENTS.md");

export function pidAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function devMarkerPath(suffix = "") {
  return path.join(process.cwd(), `.retroverse-dev-active${suffix}`);
}

function parseDevOwnershipRecord(raw) {
  return {
    owner: String(raw.owner ?? "unknown"),
    wrapperPid: Number(raw.wrapperPid ?? raw.pid),
    port: Number(raw.port ?? 3000),
    startedAt: String(raw.startedAt ?? ""),
    childPid: raw.childPid != null ? Number(raw.childPid) : null,
  };
}

export function readDevOwnershipForSuffix(suffix = "") {
  const marker = devMarkerPath(suffix);
  if (!fs.existsSync(marker)) return null;
  try {
    return parseDevOwnershipRecord(JSON.parse(fs.readFileSync(marker, "utf8")));
  } catch {
    return null;
  }
}

export function readDevOwnership() {
  return readDevOwnershipForSuffix(MARKER_SUFFIX);
}

export function writeDevOwnership(record) {
  fs.mkdirSync(path.dirname(DEV_MARKER), { recursive: true });
  fs.writeFileSync(DEV_MARKER, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

export function clearDevOwnershipForSuffix(suffix = "") {
  try {
    fs.unlinkSync(devMarkerPath(suffix));
  } catch {
    /* ignore */
  }
}

export function clearDevOwnership() {
  clearDevOwnershipForSuffix(MARKER_SUFFIX);
}

/**
 * Stop the dev server registered in a marker file, regardless of owner.
 * Only kills PIDs recorded in the marker — never arbitrary port listeners.
 */
export function stopDevServerForSuffix(suffix = "") {
  const record = readDevOwnershipForSuffix(suffix);
  if (!record) return { stopped: false, reason: "no-marker", owner: null };

  let stopped = false;
  for (const pid of [record.wrapperPid, record.childPid].filter(Boolean)) {
    if (pidAlive(pid)) {
      try {
        process.kill(pid, "SIGTERM");
        stopped = true;
      } catch {
        /* ignore */
      }
    }
  }

  if (!pidAlive(record.wrapperPid)) clearDevOwnershipForSuffix(suffix);
  return {
    stopped,
    reason: stopped ? "stopped" : "already-dead",
    owner: record.owner,
  };
}

export function portListeners(port) {
  if (process.platform === "win32") return [];
  try {
    const raw = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!raw) return [];
    return raw
      .split("\n")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

export function isPortInUse(port) {
  return portListeners(port).length > 0;
}

/**
 * Kill only PIDs registered to `owner`, or stale marker with dead wrapperPid.
 * Never kills arbitrary node listeners on the port.
 */
export function releaseOwnedDevServer(owner) {
  const record = readDevOwnership();
  if (!record) return { released: false, reason: "no-marker" };

  if (record.owner !== owner) {
    return {
      released: false,
      reason: `foreign-owner:${record.owner}`,
      foreign: true,
    };
  }

  let stopped = false;
  for (const pid of [record.wrapperPid, record.childPid].filter(Boolean)) {
    if (pidAlive(pid)) {
      try {
        process.kill(pid, "SIGTERM");
        stopped = true;
      } catch {
        /* ignore */
      }
    }
  }

  if (!pidAlive(record.wrapperPid)) clearDevOwnership();
  return { released: stopped, reason: stopped ? "stopped-owned" : "already-dead" };
}

export function appendDevServerEvent(entry) {
  fs.mkdirSync(path.dirname(EVENTS_LOG), { recursive: true });
  const stamp = new Date().toISOString();
  const lines = [
    `## ${stamp}`,
    "",
    `- **event:** ${entry.event}`,
    `- **owner:** ${entry.owner ?? "—"}`,
    `- **wrapperPid:** ${entry.wrapperPid ?? "—"}`,
    `- **childPid:** ${entry.childPid ?? "—"}`,
    `- **port:** ${entry.port ?? 3000}`,
    `- **exitCode:** ${entry.exitCode ?? "—"}`,
    `- **signal:** ${entry.signal ?? "—"}`,
    `- **command:** ${entry.command ?? "—"}`,
    `- **note:** ${entry.note ?? "—"}`,
    "",
  ];
  const header = fs.existsSync(EVENTS_LOG)
    ? ""
    : "# Dev Server Events\n\nUnexpected dev server lifecycle events.\n\n";
  fs.appendFileSync(EVENTS_LOG, header + lines.join("\n"), "utf8");
}
