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

export function readDevOwnership() {
  if (!fs.existsSync(DEV_MARKER)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(DEV_MARKER, "utf8"));
    return {
      owner: String(raw.owner ?? "unknown"),
      wrapperPid: Number(raw.wrapperPid ?? raw.pid),
      port: Number(raw.port ?? 3000),
      startedAt: String(raw.startedAt ?? ""),
      childPid: raw.childPid != null ? Number(raw.childPid) : null,
    };
  } catch {
    return null;
  }
}

export function writeDevOwnership(record) {
  fs.mkdirSync(path.dirname(DEV_MARKER), { recursive: true });
  fs.writeFileSync(DEV_MARKER, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

export function clearDevOwnership() {
  try {
    fs.unlinkSync(DEV_MARKER);
  } catch {
    /* ignore */
  }
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
