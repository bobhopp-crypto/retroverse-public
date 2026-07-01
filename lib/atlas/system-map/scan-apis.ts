import "server-only";

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

import type { SystemApiEndpoint } from "./types";

const API_ROOT = join(process.cwd(), "app/api");
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

function walkApiRoutes(dir: string, routes: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return routes;
  }

  for (const entry of entries) {
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walkApiRoutes(full, routes);
    } else if (entry === "route.ts" || entry === "route.tsx") {
      routes.push(full);
    }
  }
  return routes;
}

function filePathToEndpoint(filePath: string): string {
  const rel = relative(join(process.cwd(), "app"), filePath).replace(/\\/g, "/");
  const withoutRoute = rel.replace(/\/route\.tsx?$/, "");
  const segments = withoutRoute.split("/").slice(1).map((segment) => {
    if (segment.startsWith("(") && segment.endsWith(")")) return null;
    return segment.replace(/\[\.\.\.([^\]]+)\]/g, "*").replace(/\[([^\]]+)\]/g, ":$1");
  });
  return `/${segments.filter(Boolean).join("/")}`;
}

function extractMethods(source: string): string[] {
  const methods = HTTP_METHODS.filter((method) =>
    new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(source),
  );
  return methods.length > 0 ? methods : ["GET"];
}

function inferApiPurpose(endpoint: string, source: string): string {
  const comment = source.match(/^\s*(?:\/\*\*?\s*([^*][^\n*]+)|\/\/\s*(.+))/m);
  if (comment?.[1] || comment?.[2]) {
    return (comment[1] ?? comment[2]!).trim().slice(0, 160);
  }

  const parts = endpoint.split("/").filter(Boolean);
  if (endpoint.includes("/ops/studio/collector")) return "Studio Collector department API.";
  if (endpoint.includes("/ops/studio/editor")) return "Studio Editor department API.";
  if (endpoint.includes("/ops/studio/director")) return "Studio Director department API.";
  if (endpoint.includes("/ops/studio/publisher")) return "Studio Publisher department API.";
  if (endpoint.includes("/ops/studio/training")) return "Studio training review API.";
  if (endpoint.includes("/ops/browser-plus")) return "VirtualDJ Browser+ ops API.";
  if (endpoint.includes("/ops/finance")) return "Finance import, ledger, and reporting API.";
  if (endpoint.includes("/ops/intelligence")) return "Intelligence department API.";
  if (endpoint.includes("/ops/atlas")) return "Atlas mission and tooling API.";
  if (endpoint.includes("/live-now-playing")) return "Live now-playing bridge API.";
  if (endpoint.includes("/sunday-nights")) return "Sunday Nights live event API.";
  if (endpoint.includes("/chart-journey")) return "Chart journey experience API.";
  if (endpoint.includes("/playback")) return "Playback streaming API.";
  if (parts.length >= 2) return `${parts.slice(0, 3).join(" → ")} endpoint.`;
  return "API route handler.";
}

function collectSourceRoots(): string[] {
  const roots = [join(process.cwd(), "app"), join(process.cwd(), "components"), join(process.cwd(), "lib")];
  const files: string[] = [];

  function walk(dir: string) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".next") continue;
      const full = join(dir, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(full);
      else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(entry)) files.push(full);
    }
  }

  for (const root of roots) walk(root);
  return files;
}

export function buildApiReferenceIndex(): Map<string, string[]> {
  const index = new Map<string, Set<string>>();
  const pattern = /["'`]\/(api\/[^"'`\s?]+)/g;

  for (const file of collectSourceRoots()) {
    let source = "";
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const refs = source.matchAll(pattern);
    for (const match of refs) {
      const raw = `/${match[1]!.replace(/\/+$/, "")}`;
      const normalized = raw.replace(/:[^/]+/g, "[param]");
      if (!index.has(normalized)) index.set(normalized, new Set());
      index.get(normalized)!.add(relative(process.cwd(), file));
    }
  }

  const entries: Array<[string, string[]]> = [...index.entries()].map(([endpoint, files]) => [
    endpoint,
    [...files].sort().slice(0, 6),
  ]);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return new Map(entries);
}

function endpointMatchesReference(endpoint: string, reference: string): boolean {
  const endpointParts = endpoint.split("/").filter(Boolean);
  const refParts = reference.split("/").filter(Boolean);
  if (endpointParts.length !== refParts.length) return false;
  return endpointParts.every((part, i) => {
    const ref = refParts[i]!;
    return part === ref || part.startsWith(":") || ref === "[param]";
  });
}

export function scanApiEndpoints(referenceIndex: Map<string, string[]>): SystemApiEndpoint[] {
  const routes = walkApiRoutes(API_ROOT);

  return routes
    .map((filePath) => {
      const source = readFileSync(filePath, "utf8");
      const endpoint = filePathToEndpoint(filePath);
      const referencedBy = new Set<string>();

      for (const [ref, files] of referenceIndex.entries()) {
        if (endpointMatchesReference(endpoint, ref)) {
          for (const file of files) referencedBy.add(file);
        }
      }

      return {
        endpoint,
        methods: extractMethods(source),
        purpose: inferApiPurpose(endpoint, source),
        referencedBy: [...referencedBy].slice(0, 6),
        filePath: relative(process.cwd(), filePath),
      };
    })
    .sort((a, b) => a.endpoint.localeCompare(b.endpoint));
}
