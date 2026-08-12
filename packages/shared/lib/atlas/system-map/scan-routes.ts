import "server-only";

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

import type { RouteCategory, RouteStatus, SystemRoute } from "./types";

const APP_ROOT = join(process.cwd(), "app");

function walkPages(dir: string, pages: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return pages;
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
      walkPages(full, pages);
    } else if (entry === "page.tsx" || entry === "page.ts") {
      pages.push(full);
    }
  }
  return pages;
}

function filePathToUrl(filePath: string): string {
  const rel = relative(APP_ROOT, filePath).replace(/\\/g, "/");
  const withoutPage = rel.replace(/\/page\.tsx?$/, "");
  if (!withoutPage) return "/";
  const segments = withoutPage.split("/").map((segment) => {
    if (segment.startsWith("(") && segment.endsWith(")")) return null;
    if (segment.startsWith("@")) return null;
    return segment.replace(/\[\.\.\.([^\]]+)\]/g, "*").replace(/\[([^\]]+)\]/g, ":$1");
  });
  return `/${segments.filter(Boolean).join("/")}`.replace(/\/+/g, "/") || "/";
}

function inferTitle(filePath: string, url: string): string {
  try {
    const source = readFileSync(filePath, "utf8");
    const titleMatch =
      source.match(/title:\s*["'`]([^"'`]+)["'`]/) ??
      source.match(/title:\s*\{[^}]*default:\s*["'`]([^"'`]+)["'`]/);
    if (titleMatch?.[1]) return titleMatch[1].trim();
  } catch {
    // fall through
  }

  const last = url.split("/").filter(Boolean).pop() ?? "Home";
  return last.replace(/^:/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function categorizeRoute(url: string): RouteCategory {
  if (url.startsWith("/ops/studio")) return "Studio";
  if (url.startsWith("/ops/atlas")) return "Atlas";
  if (
    url.startsWith("/ops/finance") ||
    url.startsWith("/bobos/pass-management") ||
    url.startsWith("/bobos/pass-management") ||
    url.startsWith("/ops/pass-management") ||
    url.startsWith("/ops/pass-registrations")
  ) {
    return "Admin";
  }
  if (url.startsWith("/ops")) return "Ops";
  if (
    url.startsWith("/live") ||
    url.startsWith("/sunday-nights") ||
    url.startsWith("/retroverse-2/live")
  ) {
    return "Live";
  }
  return "Public";
}

function statusForRoute(url: string, filePath: string): RouteStatus {
  const key = `${url} ${filePath}`.toLowerCase();
  if (
    /debug|poc|pilot|\/lab|experimental|v2-poc|experience-director-pilot|creative-lab/.test(key)
  ) {
    return "Experimental";
  }
  if (
    /^\/track\//.test(url) ||
    /^\/charts/.test(url) ||
    url === "/diagnostics" ||
    url === "/index" ||
    /^\/rv\//.test(url) ||
    /^\/week\//.test(url) ||
    /legacy/.test(key)
  ) {
    return "Legacy";
  }
  if (
    url.startsWith("/ops/studio") ||
    url.startsWith("/ops/atlas") ||
    url.startsWith("/experience") ||
    url.startsWith("/retroverse-2") ||
    url === "/search" ||
    url.startsWith("/sunday-nights") ||
    url.startsWith("/ops/live")
  ) {
    return "Active";
  }
  return "Unknown";
}

export function scanAppRoutes(): SystemRoute[] {
  const pages = walkPages(APP_ROOT);
  return pages
    .map((filePath) => {
      const url = filePathToUrl(filePath);
      return {
        url,
        title: inferTitle(filePath, url),
        category: categorizeRoute(url),
        status: statusForRoute(url, filePath),
        filePath: relative(process.cwd(), filePath),
      };
    })
    .sort((a, b) => a.url.localeCompare(b.url));
}
