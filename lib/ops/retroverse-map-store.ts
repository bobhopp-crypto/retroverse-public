import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

export type RetroverseMapDecision = "keep" | "unsure" | "remove";

export type RetroverseMapCard = {
  id: string;
  title: string;
  route: string;
  notes: string;
  decision: RetroverseMapDecision;
};

export type RetroverseMapFile = {
  version: 1;
  updatedAt: string;
  cards: RetroverseMapCard[];
};

const DECISIONS = new Set<RetroverseMapDecision>(["keep", "unsure", "remove"]);

export function retroverseMapPath(): string {
  return join(process.cwd(), "data", "ops", "retroverse-map.json");
}

function cleanCard(card: Partial<RetroverseMapCard>): RetroverseMapCard | null {
  const id = card.id?.trim();
  const title = card.title?.trim();
  const route = card.route?.trim();
  const decision = card.decision;

  if (!id || !title || !route || !decision || !DECISIONS.has(decision)) return null;
  return {
    id,
    title,
    route,
    notes: card.notes?.trim() ?? "",
    decision,
  };
}

export async function loadRetroverseMap(): Promise<RetroverseMapFile> {
  const raw = await readFile(retroverseMapPath(), "utf8");
  const parsed = JSON.parse(raw) as Partial<RetroverseMapFile>;
  const cards = Array.isArray(parsed.cards)
    ? parsed.cards.map((card) => cleanCard(card)).filter((card): card is RetroverseMapCard => Boolean(card))
    : [];

  return {
    version: 1,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    cards,
  };
}

export async function saveRetroverseMap(cards: RetroverseMapCard[]): Promise<RetroverseMapFile> {
  const cleaned = cards.map((card) => cleanCard(card)).filter((card): card is RetroverseMapCard => Boolean(card));
  const file: RetroverseMapFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    cards: cleaned,
  };
  const path = retroverseMapPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return file;
}
