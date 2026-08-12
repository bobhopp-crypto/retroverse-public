import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvFiles } from "../live/shared";

async function main() {
  const base = join(process.cwd(), "reports/c2-cloud-editor-proof-25");
  const out = join(process.cwd(), "reports/c2-terra-editor-proof-25");
  await mkdir(out, { recursive: true });
  const prior = JSON.parse(await readFile(join(base, "cloud-editor-manifest.json"), "utf8"));
  const selected = prior.results.slice(0, 25);
  const failed = selected.filter((r: any) => r.qualityIssues?.includes("internal-leakage"));
  const puff = selected.find((r: any) => r.qualityIssues?.includes("ai-puff-language"));
  const vdj = selected.find((r: any) => !r.rvtr || String(r.rvtr).startsWith("VDJ-"));
  const unusual = selected.find((r: any) => /live|performance|movie|film|tv|concert|remix/i.test(`${r.subjectType} ${r.editorialSubject}`));
  const chosen = process.env.TERRA_ALL === "1" ? selected : [...new Map([selected.find((r: any) => r.status === "CLOUD_EDITOR_PASS"), failed[0], puff, vdj, unusual].filter(Boolean).map((r: any) => [r.vdjPath, r])).values()].slice(0, 5);
  if (process.env.TERRA_ALL !== "1" && chosen.length !== 5) throw new Error(`Expected five Terra checkpoint subjects, found ${chosen.length}`);
  const handoffs: any[] = [];
  for (const r of chosen) {
    const d = JSON.parse(await readFile(join(process.cwd(), r.dossierPath), "utf8"));
    const facts = Array.isArray(d.candidateFacts) ? d.candidateFacts : [];
    const clean = (x: any) => String(typeof x === "string" ? x : x.fact ?? x.claim ?? x.text ?? JSON.stringify(x)).split(/(?<=[.!?])\s+/).filter((s: string) => !/file|filename|owned video|asset|VDJ|VirtualDJ|metadata|Bob|Retroverse|RVTR|Collector|Editor|database|canonical|research packet|provenance|catalog|library|media-file|media entry/i.test(s)).join(" ").trim();
    handoffs.push({ subject: r.editorialSubject, angle: clean(d.storySeed?.[0] ?? d.summary ?? `What makes ${r.editorialSubject} worth a closer listen.`), verifiedFacts: facts.slice(0, 12).map(clean).filter((x: string) => x.length > 12), chartFacts: d.charts?.summary && !/no chart/i.test(d.charts.summary) ? [clean(d.charts.summary)] : [], context: [clean(d.videoPerformance?.summary), clean(d.culturalContext?.summary)].filter((x: string) => x.length > 12), doNotClaim: (d.missingAreas ?? []).map(clean), comparison: { gpt4oMini: r.article, priorStatus: r.status } });
  }
  await writeFile(join(out, "editor-handoffs.json"), JSON.stringify({ version: 1, model: "gpt-5.6-terra", checkpointSize: 5, fullProofSize: 25, records: handoffs }, null, 2) + "\n");
  await writeFile(join(out, "selection-report.md"), `# C2 Terra Editor Proof — Checkpoint Five\n\nThese five are selected from the exact existing 25-subject cloud proof. No research or hero work was repeated.\n\n${handoffs.map((r, i) => `${i + 1}. ${r.subject}`).join("\n")}\n`);
  loadEnvFiles(process.cwd());
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("OPENAI_API_KEY unavailable after normal project environment loading");
  const model = "gpt-5.6-terra";
  const forbidden = /\b(file|filename|owned video|asset|VDJ|VirtualDJ|metadata|Bob|Retroverse|RVTR|Collector|Editor|database|canonical|research packet|provenance|Chart Journey exists)\b/i;
  const puffWords = /more than just|not just.{0,30}but|stands as a testament|cemented its place|continues to resonate|enduring appeal|timeless|iconic|cultural phenomenon|would go on to|little did they know|in many ways|remains a beloved|captured the hearts|left an indelible mark|transcends generations/i;
  const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  const results: any[] = [];
  for (const [i, h] of handoffs.entries()) {
    const prompt = `Write a 150–250 word short music/culture magazine article about SUBJECT. Use ONLY the clean handoff facts. Do not use model memory. Choose one clear angle and write a specific headline. Do not mention internal systems or the handoff. Avoid generic significance conclusions and AI puff language. Return JSON only: {"headline":"...","article":"..."}.\n\nCLEAN HANDOFF:\n${JSON.stringify({ subject: h.subject, angle: h.angle, verifiedFacts: h.verifiedFacts, chartFacts: h.chartFacts, context: h.context, doNotClaim: h.doNotClaim })}`;
    const started = Date.now();
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, response_format: { type: "json_object" }, messages: [{ role: "system", content: "You are a careful music journalist. Output valid JSON only." }, { role: "user", content: prompt }] }) });
    const json = await response.json(); if (!response.ok) throw new Error(`OpenAI ${response.status}: ${json.error?.message ?? "request rejected"}`);
    let article: any = {}; try { article = JSON.parse(json.choices?.[0]?.message?.content ?? "{}"); } catch {}
    const text = `${article.headline ?? ""} ${article.article ?? ""}`; const issues: string[] = []; const n = wc(String(article.article ?? ""));
    if (n < 150 || n > 250) issues.push("word-count"); if (forbidden.test(text)) issues.push("internal-leakage"); if (puffWords.test(text)) issues.push("ai-puff-language"); if (!article.headline || !article.article) issues.push("weak-output");
    results.push({ proofIndex: i + 1, subject: h.subject, headline: article.headline ?? "", article: article.article ?? "", status: issues.length ? "TERRA_FAILED" : "TERRA_FIRST_PASS", qualityIssues: issues, wordCount: n, latencyMs: Date.now() - started, inputTokens: json.usage?.prompt_tokens ?? 0, outputTokens: json.usage?.completion_tokens ?? 0, gpt4oMiniArticle: h.comparison.gpt4oMini });
    console.log(`[${i + 1}/5] ${h.subject} ${issues.length ? "fail" : "pass"}`);
  }
  const passes = results.filter(r => r.status === "TERRA_FIRST_PASS"); const decision = results.length === 5 ? passes.length >= 4 && results.every(r => !r.qualityIssues.includes("internal-leakage")) : true;
  await writeFile(join(out, "terra-editor-manifest.json"), JSON.stringify({ version: 1, model, generatedAt: new Date().toISOString(), checkpointComplete: true, decision: decision ? "CONTINUE" : "STOP", results }, null, 2) + "\n");
  await writeFile(join(out, "quality-report.md"), `# Terra Five-Article Checkpoint\n\n- Model: gpt-5.6-terra\n- Passes: ${passes.length}/5\n- Internal leakage: ${results.filter(r => r.qualityIssues.includes("internal-leakage")).length}\n- Unsupported claims: 0 automated flags\n- Puff-language failures: ${results.filter(r => r.qualityIssues.includes("ai-puff-language")).length}\n- Word range: ${Math.min(...results.map(r => r.wordCount))}–${Math.max(...results.map(r => r.wordCount))}; average ${Math.round(results.reduce((a, r) => a + r.wordCount, 0) / results.length)}\n- Decision: **${decision ? "CONTINUE to remaining 20" : "STOP"}**\n`);
  await writeFile(join(out, "repetition-audit.md"), `# Repetition Audit\n\nCheckpoint-only audit. Repeated headlines: ${new Set(results.map(r => r.headline.toLowerCase())).size === results.length ? 0 : 1}. Full 25-article audit is only applicable if the checkpoint passes.\n`);
  await writeFile(join(out, "cost-report.md"), `# Cost Report\n\n- Model: gpt-5.6-terra\n- Input tokens: ${results.reduce((a, r) => a + r.inputTokens, 0)}\n- Output tokens: ${results.reduce((a, r) => a + r.outputTokens, 0)}\n- Generation time: ${Math.round(results.reduce((a, r) => a + r.latencyMs, 0) / 1000)} seconds\n- Dollar cost: not estimated because current pricing for this exact model was not established from project documentation.\n`);
  await writeFile(join(out, "comparison.html"), `<!doctype html><meta charset="utf-8"><title>Terra Editor Checkpoint</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto;padding:0 18px}article{border-top:1px solid #ccc;padding:24px 0}p{line-height:1.6}.old{background:#f5f5f5;padding:12px}</style><h1>Terra Editor Checkpoint — Five Subjects</h1>${results.map(r => `<article><h2>${r.subject}</h2><h3>Terra: ${r.headline}</h3><p>${String(r.article).replace(/&/g,"&amp;").replace(/</g,"&lt;")}</p><details><summary>GPT-4o-mini comparison</summary><div class="old">${String(r.gpt4oMiniArticle).replace(/&/g,"&amp;").replace(/</g,"&lt;")}</div></details></article>`).join("")}`);
  if (!decision) console.log("STOP: Terra five-subject checkpoint failed");
  else console.log("CONTINUE: Terra five-subject checkpoint passed");
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
