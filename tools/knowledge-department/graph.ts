import type { KnowledgeEdge, KnowledgeGraph, KnowledgeNode, MarkdownRecord } from "./types.ts";

const DEPARTMENTS = [
  "Collector",
  "Research",
  "Editor",
  "Director",
  "Publisher",
  "Archive",
  "Workers",
  "Scheduler",
  "Knowledge",
];

const SYSTEMS = [
  "Studio",
  "Browser Plus",
  "Browser Plus 3",
  "Experience 2.0",
  "Intelligence",
  "Search RV2",
  "Chart Journey",
  "Finance",
  "Live Channel",
  "Cover Integrity",
  "Match Agent",
  "VirtualDJ",
  "RVTR",
  "Public Archive",
];

const CONCEPTS = [
  "canonical graph",
  "RVTR identity",
  "song package",
  "research package",
  "cover authority",
  "chart history",
  "patron experience",
  "Ollama",
  "queue",
  "readiness",
  "needs research",
  "needs cover",
  "Retroverse Tags",
  "performance class",
];

function slug(type: string, label: string): string {
  return `${type}:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function buildKnowledgeGraph(records: MarkdownRecord[]): KnowledgeGraph {
  const nodeMap = new Map<string, KnowledgeNode>();
  const edgeMap = new Map<string, KnowledgeEdge>();

  function ensureNode(type: KnowledgeNode["type"], label: string, sourcePath: string) {
    const id = slug(type, label);
    const existing = nodeMap.get(id);
    if (existing) {
      existing.mentions++;
      if (!existing.sourcePaths.includes(sourcePath)) existing.sourcePaths.push(sourcePath);
    } else {
      nodeMap.set(id, { id, type, label, mentions: 1, sourcePaths: [sourcePath] });
    }
    return id;
  }

  function addEdge(from: string, to: string, relation: string, evidence: string) {
    const key = `${from}|${to}|${relation}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.weight++;
      if (!existing.evidence.includes(evidence)) existing.evidence.push(evidence);
    } else {
      edgeMap.set(key, { from, to, relation, weight: 1, evidence: [evidence] });
    }
  }

  for (const record of records) {
    const path = record.relativePath;
    const fileId = ensureNode("file", record.relativePath, path);
    const projectId = ensureNode("project", record.primaryProject, path);
    addEdge(projectId, fileId, "documents", path);

    for (const dept of DEPARTMENTS) {
      const re = new RegExp(dept, "i");
      if (re.test(record.title) || re.test(record.summary) || record.majorTopics.some((t) => re.test(t))) {
        const deptId = ensureNode("department", dept, path);
        addEdge(deptId, projectId, "owns_or_discusses", path);
      }
    }

    for (const sys of SYSTEMS) {
      const re = new RegExp(sys.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (
        re.test(record.relativePath) ||
        re.test(record.title) ||
        re.test(record.summary) ||
        record.majorTopics.some((t) => re.test(t))
      ) {
        const sysId = ensureNode("system", sys, path);
        addEdge(sysId, projectId, "part_of", path);
      }
    }

    for (const concept of CONCEPTS) {
      const re = new RegExp(concept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (re.test(record.summary) || record.majorTopics.some((t) => re.test(t))) {
        const conceptId = ensureNode("concept", concept, path);
        addEdge(conceptId, projectId, "discussed_in", path);
      }
    }

    for (const ref of record.referencedFiles) {
      const refId = ensureNode("file", ref, path);
      addEdge(fileId, refId, "references", path);
    }

    for (const related of record.relatedMarkdown) {
      const relId = ensureNode("file", related, path);
      addEdge(fileId, relId, "related_to", path);
    }
  }

  const nodes = [...nodeMap.values()].sort((a, b) => b.mentions - a.mentions);
  const edges = [...edgeMap.values()].sort((a, b) => b.weight - a.weight);

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    nodes,
    edges,
  };
}

export function graphHighlights(graph: KnowledgeGraph): string[] {
  return graph.nodes
    .filter((n) => n.type !== "file" && n.mentions >= 3)
    .slice(0, 25)
    .map((n) => `${n.type}: ${n.label} (${n.mentions} mentions)`);
}
