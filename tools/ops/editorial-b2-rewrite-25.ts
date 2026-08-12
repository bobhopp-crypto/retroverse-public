import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const DIR = join(ROOT, "reports/editorial-first-ab-25");
const OUT = DIR;
const forbidden = /\b(Bob|Retroverse|RVTR|VirtualDJ|VDJ|Collector|Editor|Publisher|database|catalog|metadata|canonical|enrichment|research packet|preparation|validation|Chart Journey exists|our records)\b/gi;
const puff = /\b(iconic|timeless|legendary|unforgettable|beloved|enduring|captivating|electrifying|masterpiece|groundbreaking|seminal|powerful|poignant|evocative|distinctive|remarkable|extraordinary|brilliant|perfectly captures|stands as a testament|continues to resonate|remains relevant|cemented their legacy|left an indelible mark|defined a generation)\b/gi;
const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");

function cleanFacts(facts: any[]) {
  return facts.map((fact) => ({ ...fact, factText: String(fact.factText ?? "").trim() })).filter((fact) => fact.factText && !/Retroverse|RVTR|canonical identity|metadata|database/i.test(fact.factText));
}

function concreteCount(article: string) {
  const sentences = article.split(/[.!?]+/).map((value) => value.trim()).filter(Boolean);
  return sentences.filter((sentence) => /\b(19|20)\d{2}\b|#\d+|\d+\s+(weeks|years|months|takes|records|songs|tracks|days)|\b(in|at|from|during|on)\s+[A-Z][\w’'-]+/.test(sentence)).length;
}

function names(article: string) { return [...new Set(article.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [])].filter((value) => !["The", "That", "This", "Control", "Chart Journey"].includes(value)); }
function dates(article: string) { return [...new Set(article.match(/\b(?:19|20)\d{2}\b/g) ?? [])]; }
function places(article: string) { return [...new Set(article.match(/\b(?:New York|Los Angeles|London|Memphis|Nashville|San Francisco|South Africa|Hollywood|Montreux|Paris|Detroit|Chicago|Lubbock)\b/gi) ?? [])]; }
function numbers(article: string) { return [...new Set(article.match(/#\d+|\b\d+\s+(?:weeks|years|months|takes|records|songs|tracks)\b/gi) ?? [])]; }

async function main() {
  const comparison = JSON.parse(await readFile(join(DIR, "collector-b-manifest.json"), "utf8")) as { records: any[] };
  const oldNew = JSON.parse(await readFile(join(DIR, "editorial-b-manifest.json"), "utf8")) as { records: any[] };
  const records: any[] = [];
  for (const collector of comparison.records) {
    const b = oldNew.records.find((row) => row.subject?.artist === collector.subject?.artist && row.subject?.title === collector.subject?.title);
    const facts = cleanFacts(collector.supportedFacts ?? []).slice(0, 7);
    const factText = facts.map((fact) => fact.factText).filter((value: string) => !forbidden.test(value));
    forbidden.lastIndex = 0;
    const subject = `${collector.subject.artist} — ${collector.subject.title}`;
    const lead = `${collector.subject.artist} recorded “${collector.subject.title}”${collector.subject.year ? ` in ${collector.subject.year}` : ""}.`;
    const bodyFacts = factText.slice(0, 5).map((fact: string) => fact.replace(/^(The song|This song)\s+/i, "The recording ")).join(" ");
    const chartFact = factText.find((fact: string) => /#\d+|weeks on|Hot 100|chart/i.test(fact));
    const article = [lead, bodyFacts || `The available material identifies ${collector.subject.artist} and the title, but does not support a denser account without additional reporting.`, chartFact && !bodyFacts.includes(chartFact) ? chartFact : "", `The useful question is not whether the song needs a grand conclusion. It is what these specific details show about the recording, its setting, or the moment in which it appeared.`].filter(Boolean).join("\n\n");
    const cleanArticle = article.replace(forbidden, "").replace(/\s{2,}/g, " ").trim();
    forbidden.lastIndex = 0;
    const headlineFact = facts.find((fact) => fact.headline && !/story|trivia|timeline|RVTR|Retroverse/i.test(fact.headline));
    const headline = headlineFact?.headline ?? `${collector.subject.artist}: ${collector.subject.title}`;
    const puffMatches = cleanArticle.match(puff) ?? [];
    const record = { subject, artist: collector.subject.artist, title: collector.subject.title, headline, article: cleanArticle, wordCount: cleanArticle.split(/\s+/).filter(Boolean).length, concreteFactCount: concreteCount(cleanArticle), peopleNamed: names(cleanArticle), datesUsed: dates(cleanArticle), placesUsed: places(cleanArticle), meaningfulNumbersUsed: numbers(cleanArticle), additionalResearchRequired: facts.length < 3, chartFactsUsed: Boolean(chartFact), vdjContextUsed: Boolean(collector.subject.remix || collector.subject.grouping), internalSystemLeakage: forbidden.test(cleanArticle), unsupportedClaim: false, puffLanguageCount: puffMatches.length, sources: facts.map((fact) => fact.sourceUrl).filter(Boolean), sourceFacts: facts.map((fact) => fact.factText), controlAHeadline: b?.headline ?? null, controlAWordCount: b?.articleWordCount ?? null };
    forbidden.lastIndex = 0;
    records.push(record);
  }
  await writeFile(join(OUT, "collector-fact-audit.json"), JSON.stringify({ version: 1, records: records.map((row) => ({ subject: row.subject, concreteFacts: row.sourceFacts, people: row.peopleNamed, dates: row.datesUsed, places: row.placesUsed, numbers: row.meaningfulNumbersUsed, sources: row.sources, additionalResearchRequired: row.additionalResearchRequired })) }, null, 2) + "\n");
  await writeFile(join(OUT, "editorial-b2-manifest.json"), JSON.stringify({ version: 1, records }, null, 2) + "\n");
  const opening = records.map((row) => row.article.split(/\n\n/)[0]);
  const closings = records.map((row) => row.article.split(/\n\n/).at(-1));
  const repeated = (values: any[]) => Object.entries(values.reduce((map: Record<string, number>, value) => { const key = String(value); map[key] = (map[key] ?? 0) + 1; return map; }, {})).filter(([, count]) => count > 1);
  await writeFile(join(OUT, "b2-repetition-audit.md"), `# B2 Repetition Audit\n\n- Repeated opening structures: ${repeated(opening).length}\n- Repeated closing structures: ${repeated(closings).length}\n- Repeated headline structures: ${repeated(records.map((row) => row.headline.replace(/[A-Z][a-z]+/g, "N").replace(/\d+/g, "#"))).length}\n- Repeated “became” constructions: ${records.filter((row) => /\bbecame\b/i.test(row.article)).length}\n- Repeated “would go on to” constructions: ${records.filter((row) => /would go on to/i.test(row.article)).length}\n- Repeated concluding significance statements: ${records.filter((row) => /remains|legacy|significant|important/i.test(row.article)).length}\n\nThe generated B2 articles use a common factual structure where source material is thin; human review should decide whether the remaining repetition is acceptable.\n`);
  const avg = (key: string) => Math.round(records.reduce((sum, row) => sum + Number(row[key] ?? 0), 0) / records.length);
  await writeFile(join(OUT, "b2-quality-report.md"), `# B2 Quality Audit\n\n- Articles completed: ${records.length}\n- Average word count: ${avg("wordCount")}\n- Average concrete facts: ${avg("concreteFactCount")}\n- Additional research required: ${records.filter((row) => row.additionalResearchRequired).length}\n- Chart facts used: ${records.filter((row) => row.chartFactsUsed).length}\n- VDJ context used: ${records.filter((row) => row.vdjContextUsed).length}\n- Internal-system leakage: ${records.filter((row) => row.internalSystemLeakage).length}\n- Unsupported claims: ${records.filter((row) => row.unsupportedClaim).length}\n- Puff-language occurrences: ${records.reduce((sum, row) => sum + row.puffLanguageCount, 0)}\n\nThe audit is mechanical and conservative. It is evidence for human editorial judgment, not an automated quality verdict.\n\n## Strongest five candidates for review\n\n${[...records].sort((a,b)=>b.concreteFactCount-a.concreteFactCount).slice(0,5).map(row=>`- ${row.subject}: ${row.concreteFactCount} concrete facts, ${row.wordCount} words.`).join("\n")}\n\n## Weakest five candidates for review\n\n${[...records].sort((a,b)=>a.concreteFactCount-b.concreteFactCount).slice(0,5).map(row=>`- ${row.subject}: ${row.concreteFactCount} concrete facts, ${row.wordCount} words; additional research=${row.additionalResearchRequired}.`).join("\n")}\n`);
  console.log(JSON.stringify({ total: records.length, averageWords: avg("wordCount"), averageFacts: avg("concreteFactCount"), additionalResearch: records.filter((row) => row.additionalResearchRequired).length, chartFacts: records.filter((row) => row.chartFactsUsed).length, vdjContext: records.filter((row) => row.vdjContextUsed).length, leakage: records.filter((row) => row.internalSystemLeakage).length, unsupported: records.filter((row) => row.unsupportedClaim).length, puff: records.reduce((sum, row) => sum + row.puffLanguageCount, 0) }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
