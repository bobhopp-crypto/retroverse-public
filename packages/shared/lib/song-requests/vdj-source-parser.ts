import { basename } from "path";

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function parseXmlAttributes(fragment: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const matcher = /([\w:-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(fragment))) {
    attrs[match[1]!] = decodeXml(match[2] ?? "");
  }
  return attrs;
}

export function parseFavoriteFolderPath(xml: string): string | null {
  const match = xml.match(/<FavoriteFolder\b([^>]*)\/?\s*>/i);
  if (!match) return null;
  return parseXmlAttributes(match[1] ?? "").path?.trim() || null;
}

export function parseVirtualFolderPaths(xml: string): string[] {
  const paths: string[] = [];
  const matcher = /<song\b([^>]*)\/?\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(xml))) {
    const path = parseXmlAttributes(match[1] ?? "").path?.trim();
    if (path) paths.push(path);
  }
  return paths;
}

export function parseM3uPaths(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !line.startsWith("#"))
    .map((line) => {
      if (!line.toLowerCase().startsWith("file://")) return line;
      try {
        return decodeURIComponent(new URL(line).pathname);
      } catch {
        return "";
      }
    })
    .filter((line) => line.startsWith("/"));
}

export function normalizeVirtualDjDisplayName(value: string): string {
  return value
    .replace(/\.vdjfolder$/i, "")
    .replace(/\.subfolders$/i, "")
    .trim();
}

export function normalizeSourceMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function fallbackTrackText(filePath: string): { artist: string; title: string } {
  const stem = basename(filePath).replace(/\.[^.]+$/, "").trim();
  const separator = stem.indexOf(" - ");
  if (separator < 1) return { artist: "Unknown artist", title: stem || "Untitled" };
  return {
    artist: stem.slice(0, separator).trim() || "Unknown artist",
    title: stem.slice(separator + 3).trim() || "Untitled",
  };
}
