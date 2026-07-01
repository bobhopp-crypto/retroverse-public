"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  NpmScriptCatalog,
  NpmScriptEntry,
  RunnableScriptName,
  ScriptCategory,
  ScriptSafetyLabel,
} from "@/lib/atlas/npm-script-catalog";

type Props = {
  catalog: NpmScriptCatalog;
};

type RunState = {
  scriptName: string;
  output: string;
  exitCode: number | null;
  running: boolean;
  error: string | null;
};

const SAFETY_TONE: Record<ScriptSafetyLabel, string> = {
  safe_diagnostic: "ok",
  long_running: "warn",
  writes_files: "danger",
  production_affecting: "danger",
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function parseSseChunk(buffer: string): {
  events: Array<{ event: string; data: Record<string, unknown> }>;
  rest: string;
} {
  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    const lines = part.split("\n");
    let event = "message";
    let dataLine = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      if (line.startsWith("data: ")) dataLine = line.slice(6);
    }
    if (!dataLine) continue;
    try {
      events.push({ event, data: JSON.parse(dataLine) as Record<string, unknown> });
    } catch {
      // ignore malformed chunks
    }
  }

  return { events, rest };
}

function ScriptRow({
  script,
  runningScript,
  onCopy,
  onRun,
}: {
  script: NpmScriptEntry;
  runningScript: string | null;
  onCopy: (command: string) => void;
  onRun: (scriptName: RunnableScriptName) => void;
}) {
  const tone = SAFETY_TONE[script.safety];

  return (
    <article className="atlas-scripts__row">
      <div className="atlas-scripts__row-main">
        <div className="atlas-scripts__row-head">
          <h3 className="atlas-scripts__row-name">{script.name}</h3>
          <span className={`atlas-scripts__pill atlas-scripts__pill--${tone}`}>
            {script.safetyLabel}
          </span>
        </div>
        <p className="atlas-scripts__row-desc">{script.description}</p>
        <p className="atlas-scripts__row-meta">
          <span>{script.category}</span>
          <code>{script.npmCommand}</code>
        </p>
        <pre className="atlas-scripts__row-command">{script.command}</pre>
      </div>
      <div className="atlas-scripts__row-actions">
        <button
          type="button"
          className="atlas-scripts__btn atlas-scripts__btn--secondary"
          onClick={() => onCopy(script.npmCommand)}
        >
          Copy command
        </button>
        {script.runnable ? (
          <button
            type="button"
            className="atlas-scripts__btn"
            disabled={runningScript != null}
            onClick={() => onRun(script.name as RunnableScriptName)}
          >
            {runningScript === script.name ? "Running…" : "Run"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function AtlasScriptLauncher({ catalog }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ScriptCategory | "all">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [runState, setRunState] = useState<RunState | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.scripts.filter((script) => {
      if (category !== "all" && script.category !== category) return false;
      if (!q) return true;
      return (
        script.name.toLowerCase().includes(q) ||
        script.command.toLowerCase().includes(q) ||
        script.description.toLowerCase().includes(q) ||
        script.category.toLowerCase().includes(q)
      );
    });
  }, [catalog.scripts, category, query]);

  const grouped = useMemo(() => {
    const map = new Map<ScriptCategory, NpmScriptEntry[]>();
    for (const cat of catalog.categories) map.set(cat, []);
    for (const script of filtered) {
      map.get(script.category)?.push(script);
    }
    return catalog.categories
      .map((cat) => ({ category: cat, scripts: map.get(cat) ?? [] }))
      .filter((group) => group.scripts.length > 0);
  }, [catalog.categories, filtered]);

  async function handleCopy(command: string) {
    const ok = await copyText(command);
    setCopied(ok ? command : null);
    if (ok) window.setTimeout(() => setCopied((current) => (current === command ? null : current)), 1600);
  }

  async function handleRun(scriptName: RunnableScriptName) {
    setRunState({
      scriptName,
      output: "",
      exitCode: null,
      running: true,
      error: null,
    });

    try {
      const response = await fetch("/api/ops/atlas/scripts/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptName }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setRunState({
          scriptName,
          output: "",
          exitCode: response.status,
          running: false,
          error: payload?.error ?? `Request failed (${response.status}).`,
        });
        return;
      }

      if (!response.body) {
        setRunState({
          scriptName,
          output: "",
          exitCode: 1,
          running: false,
          error: "No response stream returned.",
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let output = "";
      let exitCode: number | null = null;
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;

        for (const event of parsed.events) {
          if (event.event === "stdout" || event.event === "stderr") {
            output += String(event.data.text ?? "");
            setRunState({
              scriptName,
              output,
              exitCode,
              running: true,
              error: streamError,
            });
          }
          if (event.event === "error") {
            streamError = String(event.data.message ?? "Script failed.");
          }
          if (event.event === "exit") {
            exitCode = Number(event.data.exitCode ?? 1);
          }
        }
      }

      setRunState({
        scriptName,
        output,
        exitCode,
        running: false,
        error: streamError,
      });
    } catch (error) {
      setRunState({
        scriptName,
        output: "",
        exitCode: 1,
        running: false,
        error: error instanceof Error ? error.message : "Run failed.",
      });
    }
  }

  const runningScript = runState?.running ? runState.scriptName : null;

  return (
    <div className="atlas-scripts">
      <header className="atlas-scripts__hero">
        <p className="atlas-scripts__eyebrow">Atlas Operations</p>
        <h1 className="atlas-scripts__title">Script Launcher</h1>
        <p className="atlas-scripts__lead">
          Browse every npm script from package.json, copy commands, and run safe diagnostics without opening Terminal.
        </p>
        <p className="atlas-scripts__count">{catalog.scriptCount} scripts cataloged</p>
      </header>

      <section className="atlas-scripts__quick" aria-label="Quick diagnostic actions">
        {catalog.quickCards.map((card) => (
          <article key={card.scriptName} className="atlas-scripts__quick-card">
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <div className="atlas-scripts__quick-actions">
              <button
                type="button"
                className="atlas-scripts__btn"
                disabled={runningScript != null}
                onClick={() => handleRun(card.scriptName)}
              >
                Run
              </button>
              <button
                type="button"
                className="atlas-scripts__btn atlas-scripts__btn--secondary"
                onClick={() => handleCopy(`npm run ${card.scriptName}`)}
              >
                Copy command
              </button>
            </div>
          </article>
        ))}
      </section>

      {runState ? (
        <section className="atlas-scripts__output" aria-live="polite">
          <div className="atlas-scripts__output-head">
            <h2>Run output — {runState.scriptName}</h2>
            <p>
              {runState.running
                ? "Running…"
                : runState.exitCode === 0
                  ? `Finished · exit 0`
                  : `Finished · exit ${runState.exitCode ?? "?"}`}
            </p>
          </div>
          {runState.error ? <p className="atlas-scripts__output-error">{runState.error}</p> : null}
          <pre className="atlas-scripts__output-body">
            {runState.output || (runState.running ? "Waiting for output…" : "(no output)")}
          </pre>
        </section>
      ) : null}

      <section className="atlas-scripts__toolbar" aria-label="Search and filters">
        <label className="atlas-scripts__search-wrap">
          <span className="atlas-scripts__search-label">Search scripts</span>
          <input
            className="atlas-scripts__search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, command, category, or description…"
            autoComplete="off"
          />
        </label>

        <div className="atlas-scripts__filters">
          <button
            type="button"
            className={`atlas-scripts__filter${category === "all" ? " atlas-scripts__filter--active" : ""}`}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          {catalog.categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`atlas-scripts__filter${category === cat ? " atlas-scripts__filter--active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="atlas-scripts__results">
          Showing {filtered.length} of {catalog.scriptCount}
          {copied ? ` · Copied ${copied}` : null}
        </p>
      </section>

      <div className="atlas-scripts__groups">
        {grouped.map((group) => (
          <section key={group.category} className="atlas-scripts__group">
            <h2 className="atlas-scripts__group-title">
              {group.category}
              <span>{group.scripts.length}</span>
            </h2>
            <div className="atlas-scripts__list">
              {group.scripts.map((script) => (
                <ScriptRow
                  key={script.name}
                  script={script}
                  runningScript={runningScript}
                  onCopy={handleCopy}
                  onRun={handleRun}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="atlas-scripts__back">
        <Link href="/ops">← Command Center</Link>
        {" · "}
        <Link href="/ops/library">Library</Link>
        {" · "}
        <Link href="/ops/atlas/architecture">Architecture</Link>
      </p>
    </div>
  );
}
