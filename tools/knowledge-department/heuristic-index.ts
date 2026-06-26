import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { execSync } from "node:child_process";

import type { Confidence, MarkdownRecord } from "./types.ts";
import { fileTimestamps } from "./discover.ts";

const PROJECT_MAP: [RegExp, string][] = [
  [/^docs\/studio\//, "Studio"],
  [/^reports\/studio-alpha\//, "Studio Alpha"],
  [/^reports\/browser-plus-3\//, "Browser Plus 3"],
  [/^reports\/browser-plus/, "Browser Plus"],
  [/^reports\/experience-2\.0\//, "Experience 2.0"],
  [/^reports\/experience-director/, "Experience Director"],
  [/^reports\/chart-/, "Chart Journey"],
  [/^reports\/search-/, "Search RV2"],
  [/^reports\/coverage-/, "Coverage"],
  [/^reports\/match-agent/, "Match Agent"],
  [/^reports\/finance/, "Finance"],
  [/^reports\/intelligence\//, "Intelligence"],
  [/^reports\/cover-integrity/, "Cover Integrity"],
  [/^reports\/live-/, "Live Channel"],
  [/^reports\/research-department/, "Research Department"],
  [/^reports\/architecture\//, "Architecture"],
  [/^reports\/rvtr-/, "RVTR Identity"],
  [/^reports\/year-rv2/, "Year RV2"],
  [/^reports\/collection-/, "Collection Workflow"],
  [/^reports\/song-experience/, "Song Experience"],
  [/^reports\/package-/, "Package Pipeline"],
  [/^reports\/dk-/, "DK Retirement"],
  [/^reports\/youtube-/, "YouTube"],
  [/^docs\/PUBLIC_ARCHIVE/, "Public Archive"],
  [/^docs\//, "Documentation"],
  [/^tools\//, "Tools"],
  [/^\.cursor\//, "Cursor Rules"],
];

function recordId(relPath: string): string {
  return createHash("sha256").update(relPath).digest("hex").slice(0, 12);
}

function inferProject(relPath: string): string {
  for (const [pattern, name] of PROJECT_MAP) {
    if (pattern.test(relPath)) return name;
  }
  const parts = relPath.split("/");
  if (parts[0] === "reports" && parts[1]) {
    return parts[1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Retroverse Core";
}

function extractTitle(content: string, relPath: string): string {
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1?.[1]) return h1[1].trim();
  return basename(relPath, ".md")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractTopics(content: string): string[] {
  const topics: string[] = [];
  for (const match of content.matchAll(/^#{2,3}\s+(.+)$/gm)) {
    const t = match[1]!.replace(/\*\*/g, "").trim();
    if (t.length > 2 && t.length < 80) topics.push(t);
  }
  return [...new Set(topics)].slice(0, 12);
}

function extractReferencedFiles(content: string): string[] {
  const refs = new Set<string>();
  const patterns = [
    /`((?:[\w./@-]+)\.(?:ts|tsx|js|jsx|json|sql|md|mjs|cjs|py|sh))`/g,
    /\[([^\]]+)\]\(([^)]+\.(?:ts|tsx|js|json|md))\)/g,
    /(?:^|\s)((?:lib|app|components|tools|docs|data|ops)\/[\w./-]+\.(?:ts|tsx|json|md))/gm,
  ];
  for (const re of patterns) {
    for (const m of content.matchAll(re)) {
      const path = (m[2] ?? m[1])!.replace(/^\.\//, "").trim();
      if (path && !path.includes(" ") && path.length < 120) refs.add(path);
    }
  }
  return [...refs].slice(0, 30);
}

function extractRelatedMarkdown(content: string, allPaths: Set<string>): string[] {
  const related = new Set<string>();
  for (const m of content.matchAll(/\[([^\]]*)\]\(([^)]+\.md)\)/g)) {
    const linked = m[2]!.replace(/^\.\//, "").trim();
    if (allPaths.has(linked)) related.add(linked);
  }
  for (const m of content.matchAll(/`([^`]+\.md)`/g)) {
    const linked = m[1]!.replace(/^\.\//, "").trim();
    if (allPaths.has(linked)) related.add(linked);
  }
  for (const m of content.matchAll(/(?:docs|reports)\/[\w./-]+\.md/g)) {
    const linked = m[0]!;
    if (allPaths.has(linked)) related.add(linked);
  }
  return [...related].slice(0, 15);
}

function extractSummaryHeuristic(content: string): string {
  const lines = content.split("\n");
  let started = false;
  const paras: string[] = [];
  for (const line of lines) {
    if (line.startsWith("#")) {
      if (started) break;
      started = true;
      continue;
    }
    if (!started) continue;
    if (line.trim() === "") {
      if (paras.length) break;
      continue;
    }
    if (line.startsWith("|") || line.startsWith("```") || line.startsWith("- ")) continue;
    paras.push(line.trim());
    if (paras.join(" ").length > 200) break;
  }
  const text = paras.join(" ").slice(0, 400);
  return text || "(No summary extracted — pending Ollama enrichment)";
}

function extractDecisionsHeuristic(content: string): string[] {
  const decisions: string[] = [];
  const patterns = [
    /(?:decision|decided|chosen|approved|must never|will not|prefer|avoid)[:\s]+(.{20,120})/gi,
    /\*\*(?:Decision|Conclusion|Recommendation)\*\*[:\s]*(.{20,120})/gi,
  ];
  for (const re of patterns) {
    for (const m of content.matchAll(re)) {
      decisions.push(m[1]!.trim().replace(/\*\*/g, ""));
    }
  }
  return [...new Set(decisions)].slice(0, 5);
}

function extractOpenQuestions(content: string): string[] {
  const questions: string[] = [];
  for (const line of content.split("\n")) {
    if (line.includes("?") && line.length > 15 && line.length < 200) {
      const cleaned = line.replace(/^[-*#>\s]+/, "").trim();
      if (/\?/.test(cleaned)) questions.push(cleaned);
    }
  }
  return [...new Set(questions)].slice(0, 5);
}

function gitDates(root: string, relPath: string): { first: string | null; last: string | null } {
  try {
    const first = execSync(
      `git log --follow --format=%aI --reverse -- "${relPath}" | head -1`,
      { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
    const last = execSync(`git log -1 --format=%aI -- "${relPath}"`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return { first: first || null, last: last || null };
  } catch {
    return { first: null, last: null };
  }
}

export async function buildHeuristicRecord(
  root: string,
  relPath: string,
  allPaths: Set<string>,
): Promise<MarkdownRecord> {
  const full = `${root}/${relPath}`;
  let content: string;
  try {
    content = await readFile(full, "utf8");
  } catch (err) {
    return {
      id: recordId(relPath),
      title: basename(relPath, ".md"),
      relativePath: relPath,
      createdAt: null,
      modifiedAt: null,
      summary: "",
      primaryProject: inferProject(relPath),
      majorTopics: [],
      importantDecisions: [],
      openQuestions: [],
      referencedFiles: [],
      relatedMarkdown: [],
      confidence: "low",
      gitFirstCommit: null,
      gitLastCommit: null,
      enrichedByOllama: false,
      wordCount: 0,
      skippedReason: err instanceof Error ? err.message : "read failed",
    };
  }

  const timestamps = await fileTimestamps(root, relPath);
  const git = gitDates(root, relPath);
  const topics = extractTopics(content);
  const decisions = extractDecisionsHeuristic(content);
  const questions = extractOpenQuestions(content);

  let confidence: Confidence = "medium";
  if (topics.length >= 3 && content.length > 500) confidence = "high";
  else if (content.length < 100) confidence = "low";

  return {
    id: recordId(relPath),
    title: extractTitle(content, relPath),
    relativePath: relPath,
    createdAt: timestamps.createdAt,
    modifiedAt: timestamps.modifiedAt,
    summary: extractSummaryHeuristic(content),
    primaryProject: inferProject(relPath),
    majorTopics: topics,
    importantDecisions: decisions,
    openQuestions: questions,
    referencedFiles: extractReferencedFiles(content),
    relatedMarkdown: extractRelatedMarkdown(content, allPaths),
    confidence,
    gitFirstCommit: git.first,
    gitLastCommit: git.last,
    enrichedByOllama: false,
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

export function inferProjectFromPath(relPath: string): string {
  return inferProject(relPath);
}

export function folderContext(relPath: string): string {
  return dirname(relPath);
}
