import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "vendor",
  "cache",
  ".venv",
  ".venv-allstar",
  ".git",
]);

export async function discoverMarkdownFiles(root: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".cursor") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(relative(root, full));
      }
    }
  }

  await walk(root);
  return results.sort();
}

export async function fileTimestamps(root: string, relPath: string) {
  try {
    const s = await stat(join(root, relPath));
    return {
      createdAt: s.birthtime.toISOString(),
      modifiedAt: s.mtime.toISOString(),
    };
  } catch {
    return { createdAt: null, modifiedAt: null };
  }
}
