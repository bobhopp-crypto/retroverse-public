"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { getBroadcastStatus } from "@/app/bobos/broadcast/actions";
import { fetchRetroverseRuntimeStatus } from "@/app/bobos/runtime/actions";
import { PresentationStage } from "@/components/retroverse-live/PresentationStage";
import type { Experience, ExperienceId } from "@/lib/bobos/experience-selector/types";
import { EXPERIENCE_IDS, EXPERIENCE_NAMES } from "@/lib/bobos/experience-selector/types";

import "./experience-selector.css";

type LampTone = "green" | "yellow" | "red" | "unknown";

type RuntimeLamps = {
  studio: LampTone;
  public: LampTone;
  bridge: LampTone;
  database: LampTone;
};

type SelectorResponse = {
  ok: boolean;
  selectedId?: ExperienceId;
  experience?: Experience;
  experiences?: Experience[];
  error?: string;
};

type OutputPreview = {
  name: string;
  rvba: Experience["payload"]["rvba"];
  broadcast: Experience["payload"]["broadcast"];
  key: string;
};

const POLL_MS = 2000;

function emptyLamps(): RuntimeLamps {
  return { studio: "unknown", public: "unknown", bridge: "unknown", database: "unknown" };
}

function stageKey(experience: Experience): string {
  const rvba = experience.payload.rvba;
  const broadcast = experience.payload.broadcast;
  return [
    experience.id,
    rvba?.id ?? "off",
    rvba?.link?.id ?? "",
    rvba?.title ?? "",
    rvba?.subtitle ?? "",
    broadcast?.updatedAt ?? "",
    broadcast?.id ?? "",
  ].join("|");
}

function ExperienceCard({
  experience,
  selected,
  busy,
  onSelect,
}: {
  experience: Experience;
  selected: boolean;
  busy: boolean;
  onSelect: (id: ExperienceId) => void;
}) {
  return (
    <button
      type="button"
      className="xs-card"
      data-selected={selected ? "yes" : "no"}
      data-available={experience.available ? "yes" : "no"}
      disabled={!experience.available || busy || selected}
      onClick={() => onSelect(experience.id)}
      aria-pressed={selected}
      aria-label={`${experience.name}${selected ? ", selected" : ""}${
        experience.available ? "" : ", unavailable"
      }`}
    >
      <span className="xs-card__name">{experience.name}</span>
      <span className="xs-card__phone">
        <span className="xs-card__phone-notch" aria-hidden />
        <span className="xs-card__preview">
          <PresentationStage
            key={stageKey(experience)}
            rvba={experience.payload.rvba}
            broadcast={experience.payload.broadcast}
            offAirTitle={
              experience.id === "virtualdj"
                ? "No VirtualDJ Source"
                : experience.available
                  ? "Ready"
                  : "Unavailable"
            }
          />
        </span>
      </span>
      <span className="xs-card__status">
        {selected ? "Selected" : experience.available ? "Available" : "Unavailable"}
      </span>
    </button>
  );
}

export function ExperienceSelector() {
  const [selectedId, setSelectedId] = useState<ExperienceId>("program");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [output, setOutput] = useState<OutputPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lamps, setLamps] = useState<RuntimeLamps>(emptyLamps);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const applySnapshot = useCallback((body: SelectorResponse) => {
    if (!body.ok || !body.experiences || !body.selectedId) return;
    setSelectedId(body.selectedId);
    setExperiences(body.experiences);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function pollSelector() {
      try {
        const res = await fetch("/api/bobos/experience-selector", { cache: "no-store" });
        const body = (await res.json()) as SelectorResponse;
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setError(body.error || `Selector failed (${res.status})`);
          return;
        }
        setError(null);
        applySnapshot(body);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    async function pollRuntime() {
      try {
        const [runtime, broadcast] = await Promise.all([
          fetchRetroverseRuntimeStatus(),
          getBroadcastStatus(),
        ]);
        if (cancelled) return;

        const studio: LampTone =
          runtime.summary.overallHealth === "healthy"
            ? "green"
            : runtime.summary.overallHealth === "degraded"
              ? "yellow"
              : runtime.summary.overallHealth === "down"
                ? "red"
                : "unknown";

        const publicSync = broadcast.publicSync.state;
        const publicTone: LampTone =
          publicSync === "synced"
            ? "green"
            : publicSync === "drift" || publicSync === "off-air"
              ? "yellow"
              : publicSync === "unreachable" || publicSync === "unconfigured"
                ? "red"
                : "unknown";

        const bridge: LampTone = runtime.vdjBridgeRunning ? "green" : "red";

        const dbService = runtime.services.find((s) => s.id === "bobos" || s.id === "broadcast");
        const database: LampTone = dbService
          ? dbService.state === "running" || dbService.state === "connected"
            ? "green"
            : dbService.state === "starting" || dbService.state === "waiting"
              ? "yellow"
              : "red"
          : studio;

        setLamps({ studio, public: publicTone, bridge, database });

        // Current Output = exact playhead payload the public site resolves.
        const local = broadcast.local;
        const id = selectedIdRef.current;
        setOutput({
          name: EXPERIENCE_NAMES[id],
          rvba: local.rvba ?? null,
          broadcast: local.broadcast ?? null,
          key: [
            local.rvba?.id ?? "off",
            local.rvba?.link?.id ?? "",
            local.rvba?.title ?? "",
            local.rvba?.subtitle ?? "",
            local.broadcast?.id ?? "",
            local.updatedAt ?? "",
          ].join("|"),
        });
      } catch {
        if (!cancelled) setLamps(emptyLamps());
      }
    }

    void pollSelector();
    void pollRuntime();
    const selectorTimer = window.setInterval(pollSelector, POLL_MS);
    const runtimeTimer = window.setInterval(pollRuntime, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(selectorTimer);
      window.clearInterval(runtimeTimer);
    };
  }, [applySnapshot]);

  async function select(id: ExperienceId) {
    if (busy || id === selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bobos/experience-selector", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = (await res.json()) as SelectorResponse;
      if (!res.ok || !body.ok) {
        setError(body.error || `Could not select ${id}`);
        return;
      }
      applySnapshot(body);
      // Immediate output refresh after selection.
      try {
        const status = await getBroadcastStatus();
        const local = status.local;
        setOutput({
          name: EXPERIENCE_NAMES[id],
          rvba: local.rvba ?? null,
          broadcast: local.broadcast ?? null,
          key: [
            local.rvba?.id ?? "off",
            local.rvba?.link?.id ?? "",
            local.rvba?.title ?? "",
            local.rvba?.subtitle ?? "",
            local.broadcast?.id ?? "",
            local.updatedAt ?? "",
          ].join("|"),
        });
      } catch {
        // Next poll recovers.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const byId = new Map(experiences.map((e) => [e.id, e]));

  return (
    <div className="xs-root">
      <header className="xs-chrome">
        <div>
          <p className="xs-chrome__kicker">Retroverse</p>
          <h1 className="xs-chrome__title">Experience Selector</h1>
          <p className="xs-chrome__subtitle">Pick what appears on retroverse.live</p>
        </div>
        <Link href="/bobos" className="xs-chrome__back">
          ← Cockpit
        </Link>
      </header>

      <section className="xs-phones" aria-label="Experiences">
        {EXPERIENCE_IDS.map((id) => {
          const experience = byId.get(id) ?? {
            id,
            name: EXPERIENCE_NAMES[id],
            available: false,
            payload: { rvba: null, broadcast: null },
          };
          return (
            <ExperienceCard
              key={id}
              experience={experience}
              selected={selectedId === id}
              busy={busy}
              onSelect={select}
            />
          );
        })}
      </section>

      <section className="xs-output" aria-label="Current Output">
        <p className="xs-output__label">Current Output</p>
        <div className="xs-output__phone">
          <span className="xs-output__phone-notch" aria-hidden />
          <div className="xs-output__stage">
            <PresentationStage
              key={output?.key ?? "empty"}
              rvba={output?.rvba ?? null}
              broadcast={output?.broadcast ?? null}
              offAirTitle="Nothing selected"
            />
          </div>
        </div>
        <p className="xs-output__selected">
          Selected: <strong>{output?.name ?? EXPERIENCE_NAMES[selectedId]}</strong>
        </p>
        {error ? <p className="xs-output__error">{error}</p> : null}
      </section>

      <footer className="xs-runtime" aria-label="Runtime">
        <span className="xs-runtime__label">Runtime</span>
        {(
          [
            ["Studio", lamps.studio],
            ["Public", lamps.public],
            ["Bridge", lamps.bridge],
            ["Database", lamps.database],
          ] as const
        ).map(([label, tone]) => (
          <span key={label} className="xs-runtime__lamp" data-tone={tone}>
            <span className="xs-runtime__dot" aria-hidden />
            {label}
          </span>
        ))}
      </footer>
    </div>
  );
}
