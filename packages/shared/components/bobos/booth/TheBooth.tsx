"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef } from "react";

import {
  BOOTH_SOURCE_PADS,
  PAD_TO_SOURCE,
  boothSignalLabel,
  boothVdjPadLabel,
  controlFromState,
  createInitialBoothState,
  isOnAirPrimary,
  reduceBooth,
  returnReady,
  shouldPublishBoothOwnership,
  type BoothAction,
  type BoothSignalTone,
  type BoothSourcePad,
  type BoothState,
  type BoothVdjSourceView,
} from "@/lib/bobos/booth";

import { useBoothRuntimeHealth } from "./useBoothRuntimeHealth";

import "./booth.css";

/**
 * The Booth — Sprint 5 Playhead Publisher.
 * Booth Store owns ownership and publishes through the Broadcast pipeline.
 */

const STATUS_LAMPS = [
  { id: "ON AIR", kind: "on-air" },
  { id: "EMERGENCY", kind: "emergency" },
  { id: "OVERRIDE", kind: "override" },
  { id: "HOLD", kind: "hold" },
  { id: "VDJ CONNECTED", kind: "vdj" },
  { id: "VDJ PLAYING", kind: "vdj" },
  { id: "RUNTIME", kind: "runtime" },
  { id: "AUTO", kind: "auto" },
  { id: "AUDIENCE", kind: "audience" },
] as const;

type StatusLampId = (typeof STATUS_LAMPS)[number]["id"];

function boothOwnedLampTone(state: BoothState, lamp: StatusLampId): BoothSignalTone | null {
  switch (lamp) {
    case "ON AIR":
      return isOnAirPrimary(state.primary) ? "on" : "off";
    case "OVERRIDE":
      return state.override ? "on" : "off";
    case "HOLD":
      return state.hold ? "on" : "off";
    case "EMERGENCY":
      return state.primary === "EMERGENCY" ? "on" : "off";
    case "AUTO":
      return state.auto ? "on" : "off";
    default:
      return null;
  }
}

function dash(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

function padState(state: BoothState, pad: BoothSourcePad): "idle" | "armed" | "on-air" {
  const source = PAD_TO_SOURCE[pad];
  if (state.currentSource === source) return "on-air";
  if (state.armedSource === source) return "armed";
  return "idle";
}

function padStateLabel(padStateValue: "idle" | "armed" | "on-air"): string {
  if (padStateValue === "on-air") return "ON AIR";
  if (padStateValue === "armed") return "ARMED";
  return "IDLE";
}

function formatBridgeTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function OnAirAssetBlock({
  state,
  vdj,
}: {
  state: BoothState;
  vdj: BoothVdjSourceView;
}) {
  const vdjIsBoothSource = state.currentSource === "VirtualDJ";

  if (!vdjIsBoothSource) {
    return (
      <>
        <p className="booth-onair-hero__source">{dash(state.currentSource)}</p>
        <p className="booth-onair-hero__asset">{dash(state.currentAsset?.title)}</p>
      </>
    );
  }

  if (!vdj.asset) {
    return (
      <>
        <p className="booth-onair-hero__source">VirtualDJ</p>
        <p className="booth-onair-hero__asset booth-onair-hero__asset--idle">
          {vdj.status}
        </p>
      </>
    );
  }

  const asset = vdj.asset;
  return (
    <>
      <p className="booth-onair-hero__source">VirtualDJ</p>
      <div className="booth-onair-vdj">
        {asset.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="booth-onair-vdj__cover"
            src={asset.coverUrl}
            alt=""
            width={72}
            height={72}
          />
        ) : null}
        <div className="booth-onair-vdj__copy">
          <p className="booth-onair-hero__asset">
            {asset.artist}
            <span className="booth-onair-vdj__sep"> — </span>
            {asset.title}
          </p>
          <dl className="booth-onair-vdj__meta">
            <div>
              <dt>Album</dt>
              <dd>{dash(asset.album)}</dd>
            </div>
            <div>
              <dt>RVTR</dt>
              <dd>{dash(asset.rvtr)}</dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>{dash(asset.packageStatus)}</dd>
            </div>
            <div>
              <dt>Bridge</dt>
              <dd>{formatBridgeTime(asset.bridgeTimestamp)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}

export function TheBooth() {
  const [state, dispatch] = useReducer(reduceBooth, undefined, createInitialBoothState);
  const runtimeHealth = useBoothRuntimeHealth();
  /** Serialize ownership publishes so rapid TAKE/RETURN cannot reorder on disk. */
  const publishChainRef = useRef(Promise.resolve());
  const ownershipSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const control = controlFromState(state);
  const ready = returnReady(state);
  const onAir = isOnAirPrimary(state.primary);
  const mixerTone = state.primary === "EMERGENCY" ? "emergency" : onAir ? "live" : "standby";

  function lampTone(lamp: StatusLampId): BoothSignalTone {
    const owned = boothOwnedLampTone(state, lamp);
    if (owned) return owned;
    switch (lamp) {
      case "RUNTIME":
        return runtimeHealth.lamps.runtime;
      case "VDJ CONNECTED":
        return runtimeHealth.lamps.vdjConnected;
      case "VDJ PLAYING":
        return runtimeHealth.lamps.vdjPlaying;
      case "AUDIENCE":
        return runtimeHealth.lamps.audience;
      default:
        return "unknown";
    }
  }

  function vdjPayload() {
    return runtimeHealth.vdj.asset != null
      ? {
          artist: runtimeHealth.vdj.asset.artist,
          title: runtimeHealth.vdj.asset.title,
          rvtr: runtimeHealth.vdj.asset.rvtr,
          coverUrl: runtimeHealth.vdj.asset.coverUrl,
        }
      : null;
  }

  function applyPublishFields(result: {
    localConfidence?: "Confirmed" | "Unconfirmed" | "Fault" | null;
    publicConfidence?: "Confirmed" | "Unconfirmed" | "Fault" | null;
    statusMessage?: string | null;
    publishedKey?: string | null;
  }) {
    if (!result.localConfidence || !result.publicConfidence || !result.statusMessage) return;
    const action: BoothAction = {
      type: "APPLY_PUBLISH_RESULT",
      localConfidence: result.localConfidence,
      publicConfidence: result.publicConfidence,
      statusMessage: result.statusMessage,
      publishedKey: result.publishedKey ?? null,
    };
    stateRef.current = reduceBooth(stateRef.current, action);
    dispatch(action);
  }

  function enqueue(work: () => Promise<void>) {
    publishChainRef.current = publishChainRef.current.catch(() => undefined).then(work);
  }

  function dispatchOne(action: BoothAction) {
    // LOAD SHOW — server resolves Program; never publishes.
    if (action.type === "LOAD_SHOW") {
      dispatch(action);
      enqueue(async () => {
        if (!mountedRef.current) return;
        try {
          const res = await fetch("/api/bobos/booth/load-show", { method: "POST" });
          const body = (await res.json()) as {
            ok?: boolean;
            error?: string;
            view?: {
              presentationId: string;
              showName: string;
              currentAsset: { id: string; title: string } | null;
              nextAsset: { id: string; title: string } | null;
              upcoming: string | null;
            };
          };
          if (!mountedRef.current) return;
          if (!res.ok || !body.ok || !body.view?.currentAsset) {
            const fail: BoothAction = {
              type: "LOAD_SHOW_FAILED",
              error: body.error || `Load Show failed (${res.status})`,
            };
            stateRef.current = reduceBooth(stateRef.current, fail);
            dispatch(fail);
            return;
          }
          const load: BoothAction = {
            type: "APPLY_PROGRAM_LOAD",
            payload: {
              presentationId: body.view.presentationId,
              showName: body.view.showName,
              currentAsset: body.view.currentAsset,
              nextAsset: body.view.nextAsset,
              upcoming: body.view.upcoming,
            },
          };
          stateRef.current = reduceBooth(stateRef.current, load);
          dispatch(load);
        } catch (error) {
          if (!mountedRef.current) return;
          const fail: BoothAction = {
            type: "LOAD_SHOW_FAILED",
            error: error instanceof Error ? error.message : String(error),
          };
          stateRef.current = reduceBooth(stateRef.current, fail);
          dispatch(fail);
        }
      });
      return;
    }

    // Program transport — Presentation playhead is authoritative.
    if (
      action.type === "NEXT" ||
      action.type === "PREVIOUS" ||
      action.type === "PAUSE" ||
      action.type === "RESUME" ||
      action.type === "JUMP"
    ) {
      const prev = stateRef.current;
      if (action.type === "JUMP" && !action.itemId.trim()) {
        dispatch({ type: "LOAD_SHOW_FAILED", error: "JUMP requires an exact Program asset id" });
        return;
      }
      if (
        (action.type === "NEXT" || action.type === "PREVIOUS") &&
        prev.primary === "PROGRAM" &&
        prev.hold
      ) {
        return;
      }
      enqueue(async () => {
        if (!mountedRef.current) return;
        const ownershipAt = Date.now();
        const booth = stateRef.current;
        const op =
          action.type === "JUMP"
            ? "jump"
            : action.type === "NEXT"
              ? "next"
              : action.type === "PREVIOUS"
                ? "previous"
                : action.type === "PAUSE"
                  ? "pause"
                  : "resume";
        try {
          const res = await fetch("/api/bobos/booth/program", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              op,
              booth,
              ownershipAt,
              itemId: action.type === "JUMP" ? action.itemId : undefined,
              vdj: vdjPayload(),
            }),
          });
          const body = (await res.json()) as {
            ok?: boolean;
            error?: string;
            view?: {
              presentationId: string;
              showName: string;
              currentAsset: { id: string; title: string } | null;
              nextAsset: { id: string; title: string } | null;
              upcoming: string | null;
              paused: boolean;
              currentAvailable: boolean;
            };
            localConfidence?: "Confirmed" | "Unconfirmed" | "Fault" | null;
            publicConfidence?: "Confirmed" | "Unconfirmed" | "Fault" | null;
            statusMessage?: string | null;
            publishedKey?: string | null;
          };
          if (!mountedRef.current) return;
          if (!res.ok || !body.ok || !body.view) {
            dispatch({
              type: "LOAD_SHOW_FAILED",
              error: body.error || `Program ${op} failed`,
            });
            return;
          }
          const viewAction: BoothAction = {
            type: "APPLY_PROGRAM_VIEW",
            payload: {
              presentationId: body.view.presentationId,
              showName: body.view.showName,
              currentAsset: body.view.currentAsset,
              nextAsset: body.view.nextAsset,
              upcoming: body.view.upcoming,
              paused: body.view.paused,
              returnTarget: body.view.currentAsset,
              currentAvailable: body.view.currentAvailable,
            },
            statusMessage: body.statusMessage ?? undefined,
          };
          stateRef.current = reduceBooth(stateRef.current, viewAction);
          dispatch(viewAction);
          applyPublishFields(body);
        } catch (error) {
          if (!mountedRef.current) return;
          dispatch({
            type: "LOAD_SHOW_FAILED",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
      return;
    }

    const previous = stateRef.current;
    const projected = reduceBooth(previous, action);
    const vdj = vdjPayload();

    // GO LIVE — server first; fail closed (stay READY).
    if (
      action.type === "GO_LIVE" &&
      previous.primary === "READY" &&
      projected.primary === "PROGRAM"
    ) {
      enqueue(async () => {
        if (!mountedRef.current) return;
        const ownershipAt = Date.now();
        try {
          const res = await fetch("/api/bobos/booth/program", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ op: "go-live", booth: projected, ownershipAt }),
          });
          const body = (await res.json()) as {
            ok?: boolean;
            error?: string;
            view?: {
              presentationId: string;
              showName: string;
              currentAsset: { id: string; title: string } | null;
              nextAsset: { id: string; title: string } | null;
              upcoming: string | null;
              paused: boolean;
              currentAvailable: boolean;
            };
            localConfidence?: "Confirmed" | "Unconfirmed" | "Fault" | null;
            publicConfidence?: "Confirmed" | "Unconfirmed" | "Fault" | null;
            statusMessage?: string | null;
            publishedKey?: string | null;
          };
          if (!mountedRef.current) return;
          if (!res.ok || !body.ok || !body.view) {
            const fail: BoothAction = {
              type: "LOAD_SHOW_FAILED",
              error: body.error || "GO LIVE failed",
            };
            stateRef.current = reduceBooth(stateRef.current, fail);
            dispatch(fail);
            return;
          }
          stateRef.current = reduceBooth(stateRef.current, action);
          dispatch(action);
          const viewAction: BoothAction = {
            type: "APPLY_PROGRAM_VIEW",
            payload: {
              presentationId: body.view.presentationId,
              showName: body.view.showName,
              currentAsset: body.view.currentAsset,
              nextAsset: body.view.nextAsset,
              upcoming: body.view.upcoming,
              paused: body.view.paused,
              currentAvailable: body.view.currentAvailable,
            },
          };
          stateRef.current = reduceBooth(stateRef.current, viewAction);
          dispatch(viewAction);
          applyPublishFields(body);
        } catch (error) {
          if (!mountedRef.current) return;
          const fail: BoothAction = {
            type: "LOAD_SHOW_FAILED",
            error: error instanceof Error ? error.message : String(error),
          };
          stateRef.current = reduceBooth(stateRef.current, fail);
          dispatch(fail);
        }
      });
      return;
    }

    // RETURN — server first; fail closed (keep interrupt).
    if (action.type === "RETURN" && previous.override && projected.primary === "PROGRAM") {
      enqueue(async () => {
        if (!mountedRef.current) return;
        const ownershipAt = Date.now();
        try {
          const res = await fetch("/api/bobos/booth/program", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ op: "restore-return", booth: projected, ownershipAt }),
          });
          const body = (await res.json()) as {
            ok?: boolean;
            error?: string;
            view?: {
              presentationId: string;
              showName: string;
              currentAsset: { id: string; title: string } | null;
              nextAsset: { id: string; title: string } | null;
              upcoming: string | null;
              paused: boolean;
              currentAvailable: boolean;
            };
            localConfidence?: "Confirmed" | "Unconfirmed" | "Fault" | null;
            publicConfidence?: "Confirmed" | "Unconfirmed" | "Fault" | null;
            statusMessage?: string | null;
            publishedKey?: string | null;
          };
          if (!mountedRef.current) return;
          if (!res.ok || !body.ok || !body.view) {
            const fail: BoothAction = {
              type: "LOAD_SHOW_FAILED",
              error: body.error || "RETURN failed",
            };
            stateRef.current = reduceBooth(stateRef.current, fail);
            dispatch(fail);
            return;
          }
          stateRef.current = reduceBooth(stateRef.current, action);
          dispatch(action);
          const viewAction: BoothAction = {
            type: "APPLY_PROGRAM_VIEW",
            payload: {
              presentationId: body.view.presentationId,
              showName: body.view.showName,
              currentAsset: body.view.currentAsset,
              nextAsset: body.view.nextAsset,
              upcoming: body.view.upcoming,
              paused: body.view.paused,
              currentAvailable: body.view.currentAvailable,
            },
          };
          stateRef.current = reduceBooth(stateRef.current, viewAction);
          dispatch(viewAction);
          applyPublishFields(body);
        } catch (error) {
          if (!mountedRef.current) return;
          const fail: BoothAction = {
            type: "LOAD_SHOW_FAILED",
            error: error instanceof Error ? error.message : String(error),
          };
          stateRef.current = reduceBooth(stateRef.current, fail);
          dispatch(fail);
        }
      });
      return;
    }

    const next = projected;
    stateRef.current = next;
    dispatch(action);

    // TAKE interrupt — freeze Program playhead, then publish interrupt.
    if (
      action.type === "TAKE" &&
      next.override &&
      previous.primary === "PROGRAM" &&
      shouldPublishBoothOwnership(previous, next, vdj)
    ) {
      enqueue(async () => {
        if (!mountedRef.current) return;
        const ownershipAt = Date.now();
        try {
          await fetch("/api/bobos/booth/program", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ op: "freeze-take", booth: next, ownershipAt }),
          });
          const res = await fetch("/api/bobos/booth/publish", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ booth: stateRef.current, vdj, ownershipAt }),
          });
          const result = (await res.json()) as {
            localConfidence?: "Confirmed" | "Unconfirmed" | "Fault";
            publicConfidence?: "Confirmed" | "Unconfirmed" | "Fault";
            statusMessage?: string;
            publishedKey?: string;
            error?: string;
          };
          if (!mountedRef.current) return;
          if (!res.ok) throw new Error(result.error || `Publish HTTP ${res.status}`);
          applyPublishFields(result);
        } catch (error) {
          if (!mountedRef.current) return;
          applyPublishFields({
            localConfidence: "Fault",
            publicConfidence: "Fault",
            statusMessage: error instanceof Error ? error.message : String(error),
          });
        }
      });
      return;
    }

    if (!shouldPublishBoothOwnership(previous, next, vdj)) return;

    const ownershipAt = Date.now();
    enqueue(async () => {
      if (!mountedRef.current) return;
      try {
        const res = await fetch("/api/bobos/booth/publish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ booth: next, vdj, ownershipAt }),
        });
        const result = (await res.json()) as {
          localConfidence?: "Confirmed" | "Unconfirmed" | "Fault";
          publicConfidence?: "Confirmed" | "Unconfirmed" | "Fault";
          statusMessage?: string;
          publishedKey?: string;
          error?: string;
        };
        if (!mountedRef.current) return;
        if (!res.ok) throw new Error(result.error || `Publish HTTP ${res.status}`);
        applyPublishFields(result);
      } catch (error) {
        if (!mountedRef.current) return;
        applyPublishFields({
          localConfidence: "Fault",
          publicConfidence: "Fault",
          statusMessage: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  const localConfidence =
    state.localConfidence !== "—" ? state.localConfidence : runtimeHealth.localConfidence;
  const publicConfidence =
    state.publicConfidence !== "—" ? state.publicConfidence : runtimeHealth.publicConfidence;

  return (
    <div className="booth-root" data-tone={mixerTone}>
      <header className="booth-chrome">
        <div className="booth-chrome__identity">
          <p className="booth-chrome__kicker">RV01-20 · Cockpit</p>
          <h1 className="booth-chrome__title">The Booth</h1>
          <p className="booth-chrome__subtitle">Broadcast Mixer</p>
        </div>
        <Link href="/bobos" className="booth-chrome__back">
          ← Cockpit
        </Link>
      </header>

      <div className="booth-mixer" role="region" aria-label="Broadcast Mixer">
        {/* R1 — Status */}
        <section className="booth-r1" aria-label="R1 Status">
          <p className="booth-region-label">Status</p>
          <div className="booth-lamps" role="list" aria-label="Status lamps">
            {STATUS_LAMPS.map((lamp) => {
              const tone = lampTone(lamp.id);
              return (
                <div
                  key={lamp.id}
                  className="booth-lamp"
                  role="listitem"
                  data-state={tone}
                  data-lamp={lamp.kind}
                  title={`${lamp.id}: ${boothSignalLabel(tone)}`}
                >
                  <span className="booth-lamp__bezel" aria-hidden>
                    <span className="booth-lamp__dot" />
                  </span>
                  <span className="booth-lamp__label">{lamp.id}</span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="booth-center-row">
          {/* R2a — Sources */}
          <section className="booth-r2a" aria-label="R2a Sources">
            <p className="booth-region-label">Sources</p>
            <div className="booth-source-pads">
              {BOOTH_SOURCE_PADS.map((pad) => {
                const stateValue = padState(state, pad);
                const isVdj = pad === "VDJ";
                const runtimeLabel = isVdj
                  ? boothVdjPadLabel(runtimeHealth.vdj.pad)
                  : padStateLabel(stateValue);
                return (
                  <button
                    key={pad}
                    type="button"
                    className="booth-pad booth-pad--source"
                    data-pad-state={stateValue}
                    data-vdj-obs={isVdj ? runtimeHealth.vdj.pad : undefined}
                    title={
                      isVdj
                        ? `VirtualDJ observation: ${runtimeLabel} · Booth: ${padStateLabel(stateValue)}`
                        : undefined
                    }
                    onClick={() => dispatchOne({ type: "ARM_SOURCE", source: PAD_TO_SOURCE[pad] })}
                  >
                    <span className="booth-pad__name">{pad}</span>
                    <span className="booth-pad__state">{runtimeLabel}</span>
                    {isVdj && stateValue !== "idle" ? (
                      <span className="booth-pad__booth-own">{padStateLabel(stateValue)}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="booth-take-preview" aria-live="polite">
              {state.armedSource ? (
                <>
                  TAKE → <strong>{state.armedSource}</strong>
                </>
              ) : (
                <>TAKE → <strong>no Source armed</strong></>
              )}
            </p>
          </section>

          {/* R2b — On Air Master */}
          <section
            className="booth-r2b"
            aria-label="R2b On Air"
            data-on-air={onAir ? "yes" : "no"}
          >
            <p className="booth-region-label">On Air</p>

            <div className="booth-onair-hero">
              <p className="booth-onair-hero__tally" data-lit={onAir ? "yes" : "no"}>
                {onAir ? "ON AIR" : "OFF AIR"}
              </p>
              <OnAirAssetBlock state={state} vdj={runtimeHealth.vdj} />
              <p className="booth-onair-hero__control">
                Control · {control}
              </p>
            </div>

            <div className="booth-onair-meta">
              <div className="booth-onair-meta__cell">
                <span className="booth-onair-meta__label">Elapsed</span>
                <span className="booth-onair-meta__value">—</span>
              </div>
              <div className="booth-onair-meta__cell">
                <span className="booth-onair-meta__label">Remaining</span>
                <span className="booth-onair-meta__value">—</span>
              </div>
              <div className="booth-onair-meta__cell">
                <span className="booth-onair-meta__label">Returns In</span>
                <span className="booth-onair-meta__value">—</span>
              </div>
              <div className="booth-onair-meta__cell" data-active={state.hold ? "yes" : "no"}>
                <span className="booth-onair-meta__label">Hold</span>
                <span className="booth-onair-meta__value">—</span>
              </div>
              <div
                className="booth-onair-meta__cell"
                data-active={state.primary === "EMERGENCY" ? "yes" : "no"}
              >
                <span className="booth-onair-meta__label">Emergency</span>
                <span className="booth-onair-meta__value">—</span>
              </div>
            </div>

            {/* R2b-M — Monitoring (Runtime information, read-only) */}
            <div className="booth-monitoring" aria-label="R2b Monitoring">
              <p className="booth-region-label booth-region-label--nested">Monitoring</p>
              <ul className="booth-monitor-list">
                {runtimeHealth.monitors.map((row) => (
                  <li key={row.id} className="booth-monitor-list__row" data-tone={row.tone}>
                    <span className="booth-monitor-list__label">{row.label}</span>
                    <span className="booth-monitor-list__value">{row.value}</span>
                  </li>
                ))}
              </ul>
              <div className="booth-monitors">
                <div className="booth-monitor" data-tone={localConfidence.toLowerCase()}>
                  <span className="booth-monitor__label">Local</span>
                  <span className="booth-monitor__value">{localConfidence}</span>
                </div>
                <div
                  className="booth-monitor booth-monitor--audience"
                  data-tone={publicConfidence.toLowerCase()}
                >
                  <span className="booth-monitor__label">Public</span>
                  <span className="booth-monitor__value">{publicConfidence}</span>
                </div>
              </div>
              {runtimeHealth.error ? (
                <p className="booth-runtime-error">Runtime: {runtimeHealth.error}</p>
              ) : null}
            </div>

            <p className="booth-status-strip" aria-live="polite">
              {dash(state.statusMessage)}
            </p>
          </section>

          {/* R2c — Program */}
          <section className="booth-r2c" aria-label="R2c Program">
            <p className="booth-region-label">Program</p>
            <div className="booth-program">
              <div className="booth-program__block booth-program__block--show">
                <span className="booth-program__label">Current Show</span>
                <span className="booth-program__value">{dash(state.showName)}</span>
              </div>
              <div className="booth-program__block">
                <span className="booth-program__label">Next</span>
                <span className="booth-program__value">{dash(state.nextAsset?.title)}</span>
              </div>
              <div className="booth-program__block">
                <span className="booth-program__label">Return Target</span>
                <span className="booth-program__value">{dash(state.returnTarget?.title)}</span>
              </div>
              <div className="booth-program__block">
                <span className="booth-program__label">Upcoming</span>
                <span className="booth-program__value">{dash(state.upcoming)}</span>
              </div>
            </div>
            <div
              className="booth-lamp booth-lamp--inline"
              data-state={ready ? "on" : "off"}
              data-lamp="return-ready"
            >
              <span className="booth-lamp__bezel" aria-hidden>
                <span className="booth-lamp__dot" />
              </span>
              <span className="booth-lamp__label">RETURN READY</span>
            </div>
          </section>
        </div>

        {/* R3 Transport · R4 Cut Bus · R5 Emergency */}
        <div className="booth-bottom-row">
          <section className="booth-r3" aria-label="R3 Transport">
            <p className="booth-region-label">Transport</p>
            <div className="booth-transport">
              <button
                type="button"
                className="booth-btn booth-btn--s3"
                onClick={() => dispatchOne({ type: "PREVIOUS" })}
              >
                PREVIOUS
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--s3"
                onClick={() => dispatchOne({ type: "PAUSE" })}
              >
                PAUSE
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--s3"
                onClick={() => dispatchOne({ type: "RESUME" })}
              >
                RESUME
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--s3"
                onClick={() => dispatchOne({ type: "NEXT" })}
              >
                NEXT
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--s3 booth-btn--s2 booth-btn--hold"
                data-active={state.hold ? "yes" : "no"}
                onClick={() =>
                  dispatchOne(state.hold ? { type: "CLEAR_HOLD" } : { type: "SET_HOLD" })
                }
              >
                HOLD
              </button>
            </div>
          </section>

          <section className="booth-r4" aria-label="R4 Cut Bus">
            <p className="booth-region-label">Cut Bus</p>
            <div className="booth-cut-bus">
              <button
                type="button"
                className="booth-btn booth-btn--take"
                onClick={() => dispatchOne({ type: "TAKE", source: state.armedSource })}
              >
                TAKE
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--return"
                onClick={() => dispatchOne({ type: "RETURN" })}
              >
                RETURN
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--go-live"
                data-ready={
                  state.primary === "READY" && state.programLoaded ? "yes" : "no"
                }
                onClick={() => dispatchOne({ type: "GO_LIVE" })}
              >
                GO LIVE
              </button>
            </div>
          </section>

          <section className="booth-r5" aria-label="R5 Emergency">
            <p className="booth-region-label">Emergency</p>
            <button
              type="button"
              className="booth-btn booth-btn--emergency"
              onClick={() => dispatchOne({ type: "EMERGENCY_STOP" })}
            >
              EMERGENCY STOP
            </button>
          </section>
        </div>

        {/* R6 — Secondary Bay (folded by default) */}
        <details className="booth-r6">
          <summary className="booth-r6__summary">
            <span className="booth-region-label">Secondary</span>
            <span className="booth-r6__hint">Prep / recovery</span>
          </summary>
          <div className="booth-r6__body">
            <div className="booth-secondary-controls">
              <button
                type="button"
                className="booth-btn booth-btn--s4"
                onClick={() => dispatchOne({ type: "LOAD_SHOW" })}
              >
                Load Show
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--s4"
                onClick={() => dispatchOne({ type: "SET_AUTO", armed: true })}
              >
                Arm AUTO
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--s4"
                onClick={() => dispatchOne({ type: "SET_AUTO", armed: false })}
              >
                Disarm AUTO
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--s4"
                onClick={() => dispatchOne({ type: "PREVIEW" })}
              >
                Preview
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--s4"
                onClick={() => {
                  const itemId =
                    typeof window !== "undefined"
                      ? window.prompt("Jump to exact Program asset id")
                      : null;
                  if (!itemId?.trim()) return;
                  dispatchOne({ type: "JUMP", itemId: itemId.trim() });
                }}
              >
                Jump
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--s4"
                onClick={() => dispatchOne({ type: "END_SHOW" })}
              >
                End Show
              </button>
              <button
                type="button"
                className="booth-btn booth-btn--s4"
                onClick={() => dispatchOne({ type: "OPEN_RUNTIME" })}
              >
                Open Runtime
              </button>
            </div>
            <div className="booth-show-log" aria-label="Show Log">
              <p className="booth-show-log__title">SHOW LOG</p>
              <ol className="booth-show-log__list">
                {state.showLog.length === 0 ? (
                  <li className="booth-show-log__empty">No events</li>
                ) : (
                  state.showLog.map((entry, index) => (
                    <li key={`${entry.action}-${index}`}>
                      {entry.clock} {entry.action} {entry.source} {entry.asset} {entry.result}
                    </li>
                  ))
                )}
              </ol>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
