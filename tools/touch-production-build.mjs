#!/usr/bin/env node
/** Marks .next as produced by `next build` so the next `npm run dev` clears stale chunks. */
import fs from "node:fs";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");
fs.mkdirSync(nextDir, { recursive: true });
fs.writeFileSync(
  path.join(nextDir, ".production-build"),
  `${Date.now()}\n`,
  "utf8",
);
console.log("[build] Marked production build (dev will clear .next on next start).");
