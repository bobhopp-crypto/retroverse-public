import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type QueueExportRow = {
  title: string;
  category: string;
  source: string;
  clipStart: string;
  clipEnd: string;
  duration: string;
};

export type QueueExportInput = {
  title: string;
  category?: string;
  inSeconds: number;
  outSeconds: number;
};

export function queueExportDesktopDir(): string {
  return join(homedir(), "Desktop", "MediaLabExports");
}

export function formatQueueExportClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function buildQueueExportRows(
  source: string,
  items: QueueExportInput[],
): QueueExportRow[] {
  return items.map((item) => {
    const dur = Math.max(0, item.outSeconds - item.inSeconds);
    return {
      title: item.title.trim() || "Untitled",
      category: item.category?.trim() || "Uncategorized",
      source,
      clipStart: formatQueueExportClock(item.inSeconds),
      clipEnd: formatQueueExportClock(item.outSeconds),
      duration: formatQueueExportClock(dur),
    };
  });
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function writeQueueExportFiles(rows: QueueExportRow[]): Promise<{
  exportDir: string;
  jsonPath: string;
  csvPath: string;
}> {
  const exportDir = queueExportDesktopDir();
  await mkdir(exportDir, { recursive: true });

  const jsonPath = join(exportDir, "queue-export.json");
  const csvPath = join(exportDir, "queue-export.csv");

  await writeFile(jsonPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");

  const header = "Title,Category,Source,ClipStart,ClipEnd,Duration";
  const lines = rows.map((row) =>
    [
      row.title,
      row.category,
      row.source,
      row.clipStart,
      row.clipEnd,
      row.duration,
    ]
      .map(csvEscape)
      .join(","),
  );
  await writeFile(csvPath, `${[header, ...lines].join("\n")}\n`, "utf8");

  return { exportDir, jsonPath, csvPath };
}
