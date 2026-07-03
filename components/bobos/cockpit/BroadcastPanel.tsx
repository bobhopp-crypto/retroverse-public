"use client";

import { useCallback, useEffect, useState } from "react";

import {
  broadcastQueueOp,
  broadcastTransport,
  getBroadcastStatus,
  seedDefaultBroadcast,
  type BroadcastStatus,
} from "@/app/bobos/broadcast/actions";
import {
  PRESENTATION_ITEM_TYPES,
  PRESENTATION_ITEM_TYPE_LABELS,
  type PlayheadCommand,
  type PresentationItemType,
} from "@/lib/bobos/presentation/types";

/**
 * Broadcast Panel — the single operational control surface for what the
 * audience sees on Retroverse Live (localhost and deployed).
 *
 * A controller, not an editor: transport, queue order, add/remove.
 * Show building stays in the Presentation Studio.
 */

const POLL_MS = 2000;

const PUBLIC_SYNC_LABELS: Record<BroadcastStatus["publicSync"]["state"], string> = {
  synced: "Public: synced",
  drift: "Public: drift",
  unreachable: "Public: unreachable",
  unconfigured: "Public: push not configured",
  "off-air": "Public: off air",
};

function publishedLabel(iso: string | null): string {
  if (!iso) return "Never published";
  try {
    return `Published ${new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    })}`;
  } catch {
    return `Published ${iso}`;
  }
}

export function BroadcastPanel({ initialStatus }: { initialStatus: BroadcastStatus | null }) {
  const [status, setStatus] = useState<BroadcastStatus | null>(initialStatus);
  const [deskOpen, setDeskOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const next = await getBroadcastStatus();
        if (!cancelled) setStatus(next);
      } catch {
        // transient — next poll recovers
      }
    }
    if (!initialStatus) void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initialStatus]);

  const run = useCallback(async (action: () => Promise<BroadcastStatus>) => {
    setBusy(true);
    try {
      setStatus(await action());
    } catch {
      // keep last known status
    } finally {
      setBusy(false);
    }
  }, []);

  const transport = useCallback(
    (command: PlayheadCommand) => run(() => broadcastTransport(command)),
    [run],
  );

  const local = status?.local ?? null;
  const onAir = local?.onAir ?? false;
  const playing = local?.mode === "playing";

  return (
    <>
      <ul className="cockpit-panel__metrics" aria-label="Broadcast status">
        <li>{onAir ? `Local: ON AIR · ${playing ? "Playing" : "Paused"}` : "Local: OFF AIR"}</li>
        <li>{status ? PUBLIC_SYNC_LABELS[status.publicSync.state] : "Public: checking…"}</li>
        <li>Now: {local?.item?.title ?? "—"}</li>
        <li>Next: {local?.nextItem?.title ?? "—"}</li>
        <li>{publishedLabel(local?.publishedAt ?? null)}</li>
      </ul>

      {onAir ? (
        <div className="cockpit-broadcast__transport" aria-label="Broadcast transport">
          <button
            type="button"
            className="cockpit-panel__btn cockpit-panel__btn--secondary"
            onClick={() => void transport({ op: "previous" })}
            disabled={busy}
            aria-label="Previous item"
          >
            ⏮
          </button>
          <button
            type="button"
            className="cockpit-panel__btn cockpit-panel__btn--primary"
            onClick={() => void transport({ op: playing ? "pause" : "play" })}
            disabled={busy}
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            type="button"
            className="cockpit-panel__btn cockpit-panel__btn--secondary"
            onClick={() => void transport({ op: "next" })}
            disabled={busy}
            aria-label="Next item"
          >
            ⏭
          </button>
        </div>
      ) : (
        <div className="cockpit-broadcast__transport">
          <button
            type="button"
            className="cockpit-panel__btn cockpit-panel__btn--primary"
            onClick={() => void run(seedDefaultBroadcast)}
            disabled={busy}
          >
            Start Broadcast
          </button>
        </div>
      )}

      <div className="cockpit-panel__actions">
        <button
          type="button"
          className="cockpit-panel__btn cockpit-panel__btn--primary"
          onClick={() => setDeskOpen(true)}
        >
          Broadcast Desk
        </button>
        <a
          href="/retroverse-live"
          target="_blank"
          rel="noopener noreferrer"
          className="cockpit-panel__btn cockpit-panel__btn--secondary"
        >
          Open Local
        </a>
        <a
          href={status?.publicPlayerUrl ?? "https://retroverse.live/retroverse-live"}
          target="_blank"
          rel="noopener noreferrer"
          className="cockpit-panel__btn cockpit-panel__btn--secondary"
        >
          Open Public
        </a>
      </div>

      {deskOpen ? (
        <BroadcastDesk
          status={status}
          busy={busy}
          onTransport={transport}
          onQueueOp={(op) => run(() => broadcastQueueOp(op))}
          onSeed={() => run(seedDefaultBroadcast)}
          onClose={() => setDeskOpen(false)}
        />
      ) : null}
    </>
  );
}

/* ── Broadcast Desk — full queue + transport modal ── */

type DeskProps = {
  status: BroadcastStatus | null;
  busy: boolean;
  onTransport: (command: PlayheadCommand) => void;
  onQueueOp: (op: Parameters<typeof broadcastQueueOp>[0]) => void;
  onSeed: () => void;
  onClose: () => void;
};

function BroadcastDesk({ status, busy, onTransport, onQueueOp, onSeed, onClose }: DeskProps) {
  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState<PresentationItemType>("slide");

  const local = status?.local ?? null;
  const items = local?.queue?.items ?? [];
  const currentItemId = local?.item?.id ?? null;
  const playing = local?.mode === "playing";

  function addItem() {
    const title = addTitle.trim();
    if (!title) return;
    onQueueOp({ type: "add", title, itemType: addType });
    setAddTitle("");
  }

  return (
    <div className="cockpit-modal-backdrop" onClick={onClose}>
      <div
        className="cockpit-modal cockpit-broadcast-desk"
        role="dialog"
        aria-label="Broadcast Desk"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cockpit-modal__head">
          <div>
            <p className="cockpit-modal__kicker">Retroverse Live</p>
            <h2 className="cockpit-modal__title">Broadcast Desk</h2>
          </div>
          <button type="button" className="cockpit-modal__close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="cockpit-modal__body">
          <div className="cockpit-broadcast-desk__status">
            <span>{local?.onAir ? `ON AIR · ${playing ? "Playing" : "Paused"}` : "OFF AIR"}</span>
            <span>{status ? PUBLIC_SYNC_LABELS[status.publicSync.state] : "Public: checking…"}</span>
            <span>{publishedLabel(local?.publishedAt ?? null)}</span>
          </div>

          <div className="cockpit-broadcast__transport cockpit-broadcast__transport--desk">
            <button
              type="button"
              className="cockpit-panel__btn cockpit-panel__btn--secondary"
              onClick={() => onTransport({ op: "previous" })}
              disabled={busy || !local?.onAir}
            >
              ⏮ Prev
            </button>
            <button
              type="button"
              className="cockpit-panel__btn cockpit-panel__btn--primary"
              onClick={() => onTransport({ op: playing ? "pause" : "play" })}
              disabled={busy || !local?.onAir}
            >
              {playing ? "⏸ Pause" : "▶ Play"}
            </button>
            <button
              type="button"
              className="cockpit-panel__btn cockpit-panel__btn--secondary"
              onClick={() => onTransport({ op: "next" })}
              disabled={busy || !local?.onAir}
            >
              Next ⏭
            </button>
          </div>

          {items.length === 0 ? (
            <div className="cockpit-broadcast-desk__empty">
              <p>No broadcast queue yet.</p>
              <button
                type="button"
                className="cockpit-panel__btn cockpit-panel__btn--primary"
                onClick={onSeed}
                disabled={busy}
              >
                Start Broadcast (Welcome · Status Quo · Queen · David Bowie · Giveaway)
              </button>
            </div>
          ) : (
            <ol className="cockpit-broadcast-desk__queue" aria-label="Broadcast queue">
              {items.map((item, index) => {
                const isCurrent = item.id === currentItemId;
                const classes = [
                  "cockpit-broadcast-desk__row",
                  isCurrent ? "cockpit-broadcast-desk__row--current" : "",
                  !item.enabled ? "cockpit-broadcast-desk__row--disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <li key={item.id} className={classes}>
                    <span className="cockpit-broadcast-desk__index">{index + 1}</span>
                    <button
                      type="button"
                      className="cockpit-broadcast-desk__label"
                      onClick={() => onTransport({ op: "jump", itemId: item.id })}
                      disabled={busy || !item.enabled}
                      title="Jump playhead to this item"
                    >
                      {isCurrent ? <span className="cockpit-broadcast-desk__on">ON</span> : null}
                      {item.title}
                      <span className="cockpit-broadcast-desk__type">
                        {PRESENTATION_ITEM_TYPE_LABELS[item.type]}
                      </span>
                    </button>
                    <span className="cockpit-broadcast-desk__row-actions">
                      <button
                        type="button"
                        className="cockpit-broadcast-desk__icon"
                        onClick={() => onQueueOp({ type: "move", itemId: item.id, direction: "up" })}
                        disabled={busy || index === 0}
                        aria-label={`Move ${item.title} up`}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="cockpit-broadcast-desk__icon"
                        onClick={() => onQueueOp({ type: "move", itemId: item.id, direction: "down" })}
                        disabled={busy || index === items.length - 1}
                        aria-label={`Move ${item.title} down`}
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="cockpit-broadcast-desk__icon"
                        onClick={() => onQueueOp({ type: "toggle", itemId: item.id })}
                        disabled={busy}
                        aria-label={`${item.enabled ? "Disable" : "Enable"} ${item.title}`}
                        title={item.enabled ? "Disable" : "Enable"}
                      >
                        {item.enabled ? "◉" : "○"}
                      </button>
                      <button
                        type="button"
                        className="cockpit-broadcast-desk__icon cockpit-broadcast-desk__icon--danger"
                        onClick={() => onQueueOp({ type: "remove", itemId: item.id })}
                        disabled={busy}
                        aria-label={`Remove ${item.title}`}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="cockpit-broadcast-desk__add">
            <input
              className="cockpit-broadcast-desk__input"
              value={addTitle}
              onChange={(event) => setAddTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addItem();
              }}
              placeholder="New item title…"
              aria-label="New item title"
            />
            <select
              className="cockpit-broadcast-desk__input"
              value={addType}
              onChange={(event) => setAddType(event.target.value as PresentationItemType)}
              aria-label="New item type"
            >
              {PRESENTATION_ITEM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PRESENTATION_ITEM_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="cockpit-panel__btn cockpit-panel__btn--primary"
              onClick={addItem}
              disabled={busy || !addTitle.trim()}
            >
              + Add Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
