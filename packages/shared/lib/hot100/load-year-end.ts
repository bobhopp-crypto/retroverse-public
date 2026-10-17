import "server-only";

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";

import { isHot100Year, parseHot100Year, type Hot100Entry } from "./chart";

function chartDirectory(): string {
  const candidates = [
    join(process.cwd(), "data", "hot100-year-end"),
    join(process.cwd(), "apps", "live", "data", "hot100-year-end"),
  ];
  return candidates.find((dir) => existsSync(join(dir, "1958.json"))) ?? candidates[0]!;
}

export const loadHot100Year = cache(async (year: number): Promise<Hot100Entry[] | null> => {
  if (!isHot100Year(year)) return null;
  const raw = JSON.parse(await readFile(join(chartDirectory(), `${year}.json`), "utf8")) as unknown;
  return parseHot100Year(year, raw);
});
