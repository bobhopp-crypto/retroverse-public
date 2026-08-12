import "server-only";

import { createHash } from "crypto";
import { existsSync } from "fs";
import { readFile, readdir } from "fs/promises";
import { homedir } from "os";
import { basename, dirname, extname, join, relative, sep } from "path";

import {
  normVdjPath,
  scanVdjDatabase,
  type VdjLibraryEntry,
} from "@/lib/ops/intelligence/vdj-database";

import type {
  RequestCatalogTrackInput,
  RequestSourceKind,
  VirtualDjSourceDiscovery,
  VirtualDjSourceGroup,
  VirtualDjSourceNode,
  VirtualDjSourceSelection,
} from "./types";
import {
  fallbackTrackText,
  normalizeSourceMatch,
  normalizeVirtualDjDisplayName,
  parseFavoriteFolderPath,
  parseM3uPaths,
  parseVirtualFolderPaths,
} from "./vdj-source-parser";

const MEDIA_EXTENSIONS = new Set([
  ".aac", ".aif", ".aiff", ".avi", ".flac", ".m4a", ".m4v", ".mkv",
  ".mov", ".mp3", ".mp4", ".mpeg", ".mpg", ".ogg", ".wav", ".webm",
]);

type InternalSource = {
  publicNode: VirtualDjSourceNode;
  locator: string;
  sourceKind: RequestSourceKind;
  sourceLabel: string;
  memberPaths: string[] | null;
};

type InternalDiscovery = {
  public: VirtualDjSourceDiscovery;
  sources: Map<string, InternalSource>;
};

function virtualDjRoot(): string {
  return (
    process.env.RETROVERSE_VDJ_HOME?.trim() ||
    join(homedir(), "Library/Application Support/VirtualDJ")
  );
}

function sourceKey(kind: RequestSourceKind, locator: string, context = ""): string {
  const digest = createHash("sha256")
    .update(`${kind}\0${locator}\0${context}`)
    .digest("hex")
    .slice(0, 20);
  return `${kind}:${digest}`;
}

async function walkFiles(root: string, accept: (name: string) => boolean): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && accept(entry.name)) out.push(path);
    }
  }
  await walk(root);
  return out.sort((a, b) => a.localeCompare(b));
}

function entryDirectory(entry: VdjLibraryEntry): string {
  return normVdjPath(dirname(entry.filePath));
}

function eligibleEntry(entry: VdjLibraryEntry): boolean {
  return Boolean(entry.filePath) && MEDIA_EXTENSIONS.has(extname(entry.filePath).toLowerCase()) && existsSync(entry.filePath);
}

function publicGroupNode(name: string, displayPath: string, children: VirtualDjSourceNode[]): VirtualDjSourceNode {
  return {
    sourceKey: `group:${displayPath}`,
    name,
    displayPath,
    kind: "group",
    selectable: false,
    eligibleTrackCount: children.reduce((sum, child) => sum + child.eligibleTrackCount, 0),
    includeDescendants: false,
    children,
  };
}

function rvtrFromEntry(entry: VdjLibraryEntry): string | null {
  return entry.label.match(/RVTR\d{6}/i)?.[0]?.toUpperCase() ?? null;
}

function catalogTrack(entry: VdjLibraryEntry, sourceRoot: string | null): RequestCatalogTrackInput {
  const fallback = fallbackTrackText(entry.filePath);
  return {
    rvtr: rvtrFromEntry(entry),
    // In this VirtualDJ database schema FilePath is the exact song-record identity.
    virtualDjTrackIdentity: entry.filePath,
    artist: entry.artist.trim() || fallback.artist,
    title: entry.title.trim() || fallback.title,
    year: entry.year,
    localMediaPath: entry.filePath,
    sourceRelativePath: sourceRoot ? relative(sourceRoot, entry.filePath).split(sep).join("/") : basename(entry.filePath),
  };
}

async function physicalFolderNode(input: {
  name: string;
  path: string;
  displayPath: string;
  byDirectory: Map<string, VdjLibraryEntry[]>;
  sources: Map<string, InternalSource>;
}): Promise<VirtualDjSourceNode> {
  const entries = await readdir(input.path, { withFileTypes: true }).catch(() => []);
  const childDirectories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name));
  const children = await Promise.all(
    childDirectories.map((entry) =>
      physicalFolderNode({
        name: entry.name,
        path: join(input.path, entry.name),
        displayPath: `${input.displayPath}/${entry.name}`,
        byDirectory: input.byDirectory,
        sources: input.sources,
      }),
    ),
  );
  const directTracks = input.byDirectory.get(normVdjPath(input.path)) ?? [];
  // The same physical folder may appear under more than one VirtualDJ favorite.
  // Keep those tree identities distinct so VIDEO/1960's is not confused with a
  // duplicate reached through DJ MEDIA or Ideas.
  const key = sourceKey("folder", input.path, input.displayPath);
  const node: VirtualDjSourceNode = {
    sourceKey: key,
    name: input.name,
    displayPath: input.displayPath,
    kind: "folder",
    selectable: true,
    eligibleTrackCount: directTracks.length,
    includeDescendants: false,
    children,
  };
  input.sources.set(key, {
    publicNode: node,
    locator: input.path,
    sourceKind: "folder",
    sourceLabel: input.displayPath,
    memberPaths: null,
  });
  return node;
}

function insertHierarchy(root: VirtualDjSourceNode[], parts: string[], leaf: VirtualDjSourceNode): void {
  if (parts.length <= 1) {
    const existing = root.find((node) => node.name === leaf.name);
    if (existing) {
      const children = existing.children;
      Object.assign(existing, leaf, { children });
      return;
    }
    root.push(leaf);
    return;
  }
  const [head, ...rest] = parts;
  let group = root.find((node) => node.name === head);
  if (!group) {
    group = publicGroupNode(head!, head!, []);
    root.push(group);
  }
  insertHierarchy(group.children, rest, leaf);
  group.eligibleTrackCount = group.children.reduce((sum, child) => sum + child.eligibleTrackCount, 0);
}

async function discoverFavoriteFolders(
  root: string,
  byDirectory: Map<string, VdjLibraryEntry[]>,
  sources: Map<string, InternalSource>,
): Promise<VirtualDjSourceNode[]> {
  const folderRoot = join(root, "Folders");
  const descriptors = await walkFiles(folderRoot, (name) => name.toLowerCase().endsWith(".vdjfolder"));
  const nodes: VirtualDjSourceNode[] = [];
  for (const descriptor of descriptors) {
    const xml = await readFile(descriptor, "utf8").catch(() => "");
    const physicalPath = parseFavoriteFolderPath(xml);
    if (!physicalPath || !existsSync(physicalPath)) continue;
    const descriptorRelative = relative(folderRoot, descriptor);
    const parts = descriptorRelative.split(sep).map(normalizeVirtualDjDisplayName);
    const displayPath = parts.join("/");
    const node = await physicalFolderNode({
      name: parts.at(-1) || basename(physicalPath),
      path: physicalPath,
      displayPath,
      byDirectory,
      sources,
    });
    insertHierarchy(nodes, parts, node);
  }
  return nodes.sort((a, b) => a.name.localeCompare(b.name));
}

async function discoverPathLists(input: {
  root: string;
  groupRoot: string;
  kind: "list" | "playlist";
  extensions: Set<string>;
  dbByPath: Map<string, VdjLibraryEntry>;
  sources: Map<string, InternalSource>;
}): Promise<VirtualDjSourceNode[]> {
  const files = await walkFiles(input.groupRoot, (name) => input.extensions.has(extname(name).toLowerCase()));
  const nodes: VirtualDjSourceNode[] = [];
  for (const path of files) {
    const raw = await readFile(path, "utf8").catch(() => "");
    const memberPaths = input.kind === "list" ? parseVirtualFolderPaths(raw) : parseM3uPaths(raw);
    const uniqueEligible = new Set(
      memberPaths
        .map(normVdjPath)
        .filter((memberPath) => {
          const entry = input.dbByPath.get(memberPath);
          return entry ? eligibleEntry(entry) : false;
        }),
    );
    const rel = relative(input.groupRoot, path);
    const parts = rel
      .split(sep)
      .map(normalizeVirtualDjDisplayName)
      .filter((part) => part && part !== "order");
    const name = parts.at(-1) || normalizeVirtualDjDisplayName(basename(path));
    const displayPath = parts.join("/");
    const key = sourceKey(input.kind, path);
    const node: VirtualDjSourceNode = {
      sourceKey: key,
      name,
      displayPath,
      kind: input.kind,
      selectable: uniqueEligible.size > 0,
      eligibleTrackCount: uniqueEligible.size,
      includeDescendants: false,
      children: [],
    };
    input.sources.set(key, {
      publicNode: node,
      locator: path,
      sourceKind: input.kind,
      sourceLabel: `${input.kind === "list" ? "My Lists" : "Playlists"}/${displayPath}`,
      memberPaths,
    });
    insertHierarchy(nodes, parts, node);
  }
  return nodes.sort((a, b) => a.name.localeCompare(b.name));
}

function flatten(nodes: VirtualDjSourceNode[]): VirtualDjSourceNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

async function discoverInternal(): Promise<InternalDiscovery> {
  const root = virtualDjRoot();
  const scan = await scanVdjDatabase();
  const eligible = scan.entries.filter(eligibleEntry);
  const byDirectory = new Map<string, VdjLibraryEntry[]>();
  const dbByPath = new Map<string, VdjLibraryEntry>();
  for (const entry of eligible) {
    dbByPath.set(entry.filePathNorm, entry);
    const directory = entryDirectory(entry);
    const bucket = byDirectory.get(directory) ?? [];
    bucket.push(entry);
    byDirectory.set(directory, bucket);
  }

  const sources = new Map<string, InternalSource>();
  const folders = await discoverFavoriteFolders(root, byDirectory, sources);
  const lists = await discoverPathLists({
    root,
    groupRoot: join(root, "MyLists"),
    kind: "list",
    extensions: new Set([".vdjfolder"]),
    dbByPath,
    sources,
  });
  const playlists = await discoverPathLists({
    root,
    groupRoot: join(root, "Playlists"),
    kind: "playlist",
    extensions: new Set([".m3u", ".m3u8"]),
    dbByPath,
    sources,
  });

  const defaultNode = flatten(folders)
    .filter((node) => node.kind === "folder" && node.selectable)
    .sort((a, b) => a.displayPath.split("/").length - b.displayPath.split("/").length)
    .find((node) => {
      const parts = node.displayPath.split("/");
      return (
        normalizeSourceMatch(parts.at(-2) ?? "") === "video" &&
        normalizeSourceMatch(parts.at(-1) ?? "") === "1960s"
      );
    });

  const groups: VirtualDjSourceGroup[] = [
    {
      id: "folders",
      label: "FOLDERS",
      children: folders,
      note: "Folder counts include direct VirtualDJ database members only. Select subfolders explicitly.",
    },
    {
      id: "lists",
      label: "MY LISTS",
      children: lists,
      note: "VirtualDJ My Lists are supported when every song has an exact local path.",
    },
    {
      id: "playlists",
      label: "PLAYLISTS",
      children: playlists,
      note: playlists.length
        ? "Path-based M3U playlists are supported."
        : "No path-based M3U playlists were found; text-only playlist files are not safe request sources.",
    },
  ];

  return {
    public: {
      scannedAt: scan.scannedAt,
      databasePath: scan.path,
      groups,
      defaultSourceKey: defaultNode?.sourceKey ?? null,
      notices: [
        "Selecting a folder does not include nested subfolders.",
        "Catalog identity and metadata come from the current VirtualDJ database; membership comes from the selected folder path or list file.",
      ],
    },
    sources,
  };
}

export async function discoverVirtualDjSources(): Promise<VirtualDjSourceDiscovery> {
  return (await discoverInternal()).public;
}

export async function loadVirtualDjSourceSelection(sourceKeyInput: string): Promise<VirtualDjSourceSelection> {
  const discovery = await discoverInternal();
  const source = discovery.sources.get(sourceKeyInput);
  if (!source || !source.publicNode.selectable) throw new Error("VirtualDJ source is unavailable.");

  const scan = await scanVdjDatabase();
  const byPath = new Map(scan.entries.filter(eligibleEntry).map((entry) => [entry.filePathNorm, entry]));
  const entries = source.sourceKind === "folder"
    ? scan.entries.filter(
        (entry) => eligibleEntry(entry) && entryDirectory(entry) === normVdjPath(source.locator),
      )
    : (source.memberPaths ?? [])
        .map((path) => byPath.get(normVdjPath(path)))
        .filter((entry): entry is VdjLibraryEntry => Boolean(entry));

  const seen = new Set<string>();
  const tracks = entries
    .filter((entry) => {
      if (seen.has(entry.filePathNorm)) return false;
      seen.add(entry.filePathNorm);
      return true;
    })
    .map((entry) => catalogTrack(entry, source.sourceKind === "folder" ? source.locator : null));

  return {
    sourceKey: source.publicNode.sourceKey,
    sourceKind: source.sourceKind,
    sourceLabel: source.sourceLabel,
    includeDescendants: false,
    tracks,
  };
}
