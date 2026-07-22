import type { WorkbenchCard, WorkbenchCatalogResponse, WorkbenchDecision } from "./types";

function linesForDecision(cards: WorkbenchCard[], decision: WorkbenchDecision): string[] {
  return cards
    .filter((card) => card.review.decision === decision)
    .map((card) => {
      const note = card.review.notes.trim();
      return note
        ? `- **${card.displayId} · ${card.title}** (\`${card.route ?? "—"}\`) — ${note}`
        : `- **${card.displayId} · ${card.title}** (\`${card.route ?? "—"}\`)`;
    });
}

export type CategoryHealthRow = {
  id: string;
  title: string;
  total: number;
  reviewed: number;
  keep: number;
  retire: number;
  unreviewed: number;
  rename: number;
  move: number;
  reviewLater: number;
};

export function buildCategoryHealth(catalog: WorkbenchCatalogResponse): CategoryHealthRow[] {
  return catalog.categories.map((cat) => {
    const cards = catalog.cards.filter((card) => card.category === cat.id);
    return {
      id: cat.id,
      title: cat.title,
      total: cards.length,
      reviewed: cards.filter((card) => card.review.decision).length,
      keep: cards.filter((card) => card.review.decision === "keep").length,
      retire: cards.filter((card) => card.review.decision === "retire").length,
      unreviewed: cards.filter((card) => !card.review.decision).length,
      rename: cards.filter((card) => card.review.decision === "rename").length,
      move: cards.filter((card) => card.review.decision === "move").length,
      reviewLater: cards.filter((card) => card.review.decision === "review-later").length,
    };
  }).filter((row) => row.total > 0);
}

/** Blueprint Markdown for the next cleanup sprint. Does not modify the registry. */
export function buildReviewReportMarkdown(catalog: WorkbenchCatalogResponse): string {
  const generatedAt = new Date().toISOString();
  const { cards, counts } = catalog;
  const health = buildCategoryHealth(catalog);
  const unresolved = cards.filter((card) => card.review.decision === "review-later");

  const sections: string[] = [
    "# RV Registry Workbench — Architectural Review Report",
    "",
    `_Generated ${generatedAt}_`,
    "",
    "This report is a blueprint for the next cleanup sprint.",
    "It does **not** modify the RV registry, rename applications, or delete routes.",
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Total applications | ${counts.total} |`,
    `| Reviewed | ${counts.reviewed} |`,
    `| Not reviewed | ${counts.byDecision.none} |`,
    `| Keep | ${counts.byDecision.keep} |`,
    `| Rename | ${counts.byDecision.rename} |`,
    `| Move | ${counts.byDecision.move} |`,
    `| Retire | ${counts.byDecision.retire} |`,
    `| Review Later | ${counts.byDecision["review-later"]} |`,
    `| Viewed | ${counts.viewed} |`,
    `| Not viewed | ${counts.total - counts.viewed} |`,
    "",
    "## Applications to Keep",
    "",
    ...(linesForDecision(cards, "keep").length
      ? linesForDecision(cards, "keep")
      : ["_None_"]),
    "",
    "## Applications to Rename",
    "",
    ...(linesForDecision(cards, "rename").length
      ? linesForDecision(cards, "rename")
      : ["_None_"]),
    "",
    "## Applications to Move",
    "",
    ...(linesForDecision(cards, "move").length
      ? linesForDecision(cards, "move")
      : ["_None_"]),
    "",
    "## Applications to Retire",
    "",
    ...(linesForDecision(cards, "retire").length
      ? linesForDecision(cards, "retire")
      : ["_None_"]),
    "",
    "## Unresolved questions",
    "",
    ...(unresolved.length
      ? unresolved.map((card) => {
          const note = card.review.notes.trim();
          return note
            ? `- **${card.displayId} · ${card.title}** — ${note}`
            : `- **${card.displayId} · ${card.title}** — marked Review Later (no note)`;
        })
      : ["_None — every application has a firm decision._"]),
    "",
    "## Category statistics",
    "",
    `| Category | Total | Reviewed | Keep | Rename | Move | Retire | Later | Unreviewed |`,
    `| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
    ...health.map(
      (row) =>
        `| ${row.id} ${row.title} | ${row.total} | ${row.reviewed} | ${row.keep} | ${row.rename} | ${row.move} | ${row.retire} | ${row.reviewLater} | ${row.unreviewed} |`,
    ),
    "",
    "## Retirement impact notes",
    "",
    ...cards
      .filter((card) => card.review.decision === "retire")
      .flatMap((card) => {
        if (card.retirementImpact.length === 0) {
          return [`- **${card.displayId} · ${card.title}** — no structural references detected`];
        }
        return [
          `- **${card.displayId} · ${card.title}** — referenced by: ${card.retirementImpact.join(", ")}`,
        ];
      }),
    "",
  ];

  if (!cards.some((card) => card.review.decision === "retire")) {
    sections.push("_No retire candidates._", "");
  }

  return `${sections.join("\n").trim()}\n`;
}

export function downloadReviewReportMarkdown(catalog: WorkbenchCatalogResponse): void {
  const markdown = buildReviewReportMarkdown(catalog);
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rv-registry-review-${stamp}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}
