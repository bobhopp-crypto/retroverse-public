"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ActiveRequestEvent,
  OperatorRequest,
  VirtualDjSourceDiscovery,
  VirtualDjSourceNode,
} from "@/lib/song-requests/types";

import "./song-request-operator.css";

type SourcePayload = {
  discovery: VirtualDjSourceDiscovery;
  activeEvent: ActiveRequestEvent | null;
  databaseReady: boolean;
};

type DashboardPayload = {
  event: ActiveRequestEvent | null;
  requests: OperatorRequest[];
};

async function json<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
}

function todayEventKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function flatten(nodes: VirtualDjSourceNode[]): VirtualDjSourceNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function SourceTreeNode(props: {
  node: VirtualDjSourceNode;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const { node } = props;
  const row = (
    <div className="request-source__row" data-selected={props.selected === node.sourceKey ? "true" : "false"}>
      {node.selectable ? (
        <label>
          <input
            type="radio"
            name="request-source"
            checked={props.selected === node.sourceKey}
            onChange={() => props.onSelect(node.sourceKey)}
          />
          <span>{node.name}</span>
        </label>
      ) : (
        <strong>{node.name}</strong>
      )}
      {node.kind !== "group" ? <small>{node.eligibleTrackCount.toLocaleString()}</small> : null}
    </div>
  );

  if (node.children.length === 0) return <li>{row}</li>;
  return (
    <li>
      <details open={node.displayPath === "VIDEO" || node.displayPath.startsWith("VIDEO/")}>
        <summary>{row}</summary>
        <ul>
          {node.children.map((child) => (
            <SourceTreeNode
              key={`${child.kind}:${child.sourceKey}:${child.displayPath}`}
              node={child}
              selected={props.selected}
              onSelect={props.onSelect}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function SongRequestOperator() {
  const [sources, setSources] = useState<SourcePayload | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload>({ event: null, requests: [] });
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [eventId, setEventId] = useState(todayEventKey());
  const [eventTitle, setEventTitle] = useState("Retroverse Live");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");

  const refreshDashboard = useCallback(async () => {
    try {
      const next = await json<DashboardPayload>(
        await fetch("/api/ops/song-requests", { cache: "no-store" }),
      );
      setDashboard(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not refresh requests.");
    }
  }, []);

  const refreshSources = useCallback(async () => {
    try {
      const next = await json<SourcePayload>(
        await fetch("/api/ops/song-requests/source", { cache: "no-store" }),
      );
      setSources(next);
      setSelectedSource((current) => current ?? next.discovery.defaultSourceKey);
      if (next.activeEvent) {
        setEventId(next.activeEvent.eventId);
        setEventTitle(next.activeEvent.title);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read VirtualDJ.");
    }
  }, []);

  useEffect(() => {
    void Promise.all([refreshSources(), refreshDashboard()]);
    const timer = window.setInterval(() => void refreshDashboard(), 10_000);
    return () => window.clearInterval(timer);
  }, [refreshDashboard, refreshSources]);

  const allNodes = useMemo(
    () => sources?.discovery.groups.flatMap((group) => flatten(group.children)) ?? [],
    [sources],
  );
  const selectedNode = allNodes.find((node) => node.sourceKey === selectedSource) ?? null;

  async function activate() {
    if (!selectedSource) return;
    setBusy(true);
    setError(null);
    try {
      await json<{ ok: true; activeEvent: ActiveRequestEvent }>(
        await fetch("/api/ops/song-requests/source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, eventTitle, sourceKey: selectedSource }),
        }),
      );
      await Promise.all([refreshSources(), refreshDashboard()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not activate source.");
    } finally {
      setBusy(false);
    }
  }

  async function action(
    requestId: number,
    requestAction: "accept" | "skip" | "played" | "respond" | "replenish",
    response?: string,
  ) {
    setBusy(true);
    setError(null);
    try {
      await json<{ ok: true }>(
        await fetch("/api/ops/song-requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, action: requestAction, response }),
        }),
      );
      setRespondingTo(null);
      setResponseText("");
      await refreshDashboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="request-ops">
      <header className="request-ops__header">
        <div>
          <p>RETROVERSE LIVE</p>
          <h1>Song Requests</h1>
        </div>
        <a href="/ops">Ops</a>
      </header>

      {error ? <div className="request-ops__error">{error}</div> : null}

      <details className="request-source" open={!dashboard.event}>
        <summary>
          <span>Request catalog source</span>
          <strong>
            {dashboard.event?.sourceLabel ?? selectedNode?.displayPath ?? "Choose a VirtualDJ source"}
          </strong>
        </summary>
        <div className="request-source__body">
          <div className="request-source__event">
            <label>
              <span>Event key</span>
              <input value={eventId} onChange={(event) => setEventId(event.target.value)} />
            </label>
            <label>
              <span>Event title</span>
              <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} />
            </label>
          </div>

          {!sources ? <p>Reading VirtualDJ…</p> : null}
          {sources && !sources.databaseReady ? (
            <p className="request-source__setup">
              Source preview is ready. Install the additive song-request migration before activation.
            </p>
          ) : null}

          {sources?.discovery.groups.map((group) => (
            <section className="request-source__group" key={group.id}>
              <h2>{group.label}</h2>
              <p>{group.note}</p>
              {group.children.length ? (
                <ul className="request-source__tree">
                  {group.children.map((node) => (
                    <SourceTreeNode
                      key={`${node.kind}:${node.sourceKey}:${node.displayPath}`}
                      node={node}
                      selected={selectedSource}
                      onSelect={setSelectedSource}
                    />
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {selectedNode ? (
            <div className="request-source__selection">
              <p>
                <span>Selected</span>
                <strong>{selectedNode.displayPath}</strong>
              </p>
              <p>
                <span>Eligible tracks</span>
                <strong>{selectedNode.eligibleTrackCount.toLocaleString()}</strong>
              </p>
              <p>
                <span>Nested folders</span>
                <strong>Explicit selection required</strong>
              </p>
            </div>
          ) : null}

          <button
            type="button"
            className="request-source__activate"
            disabled={busy || !selectedSource || !sources?.databaseReady}
            onClick={() => void activate()}
          >
            {busy ? "Activating…" : "Activate for this event"}
          </button>
        </div>
      </details>

      <section className="request-queue">
        <header>
          <div>
            <p>Current event</p>
            <h2>{dashboard.event?.title ?? "No active request event"}</h2>
          </div>
          <button type="button" onClick={() => void refreshDashboard()}>
            Refresh
          </button>
        </header>

        <div className="request-queue__list">
          {dashboard.requests.length === 0 ? (
            <p className="request-queue__empty">No requests yet.</p>
          ) : null}
          {dashboard.requests.map((request) => (
            <article className="request-card" data-status={request.status} key={request.id}>
              <div className="request-card__top">
                <time>{formatTime(request.requestedAt)}</time>
                <span>{request.status}</span>
              </div>
              <h3>{request.title}</h3>
              <p className="request-card__artist">
                {request.artist}{request.year ? ` · ${request.year}` : ""}
              </p>
              <p className="request-card__member">
                {request.memberFirstName} · Pass {request.passSerial}
              </p>
              {request.guestComment ? <blockquote>{request.guestComment}</blockquote> : null}
              {request.djResponse ? <p className="request-card__response">Sent: {request.djResponse}</p> : null}
              {request.priorRequests.length ? (
                <details className="request-card__history">
                  <summary>Earlier requests ({request.priorRequests.length})</summary>
                  <ul>
                    {request.priorRequests.map((prior, index) => (
                      <li key={`${prior.requestedAt}:${index}`}>{prior.title} — {prior.artist}</li>
                    ))}
                  </ul>
                </details>
              ) : null}

              <div className="request-card__actions">
                <button type="button" disabled={busy || request.status !== "new"} onClick={() => void action(request.id, "accept")}>ACCEPT</button>
                <button type="button" disabled={busy || (request.status !== "new" && request.status !== "accepted")} onClick={() => void action(request.id, "skip")}>SKIP</button>
                <button type="button" disabled={busy || request.status !== "accepted"} onClick={() => void action(request.id, "played")}>PLAYED</button>
                <button type="button" disabled={busy} onClick={() => setRespondingTo(request.id)}>RESPOND</button>
                <button type="button" disabled={busy} onClick={() => void action(request.id, "replenish")}>REPLENISH</button>
              </div>

              {respondingTo === request.id ? (
                <div className="request-card__respond">
                  <div>
                    {["Coming up soon.", "Great pick!", "I’ll see what I can do."].map((reply) => (
                      <button type="button" key={reply} onClick={() => setResponseText(reply)}>{reply}</button>
                    ))}
                  </div>
                  <input
                    type="text"
                    maxLength={240}
                    value={responseText}
                    onChange={(event) => setResponseText(event.target.value)}
                    placeholder="Short response"
                  />
                  <button
                    type="button"
                    disabled={busy || !responseText.trim()}
                    onClick={() => void action(request.id, "respond", responseText)}
                  >
                    Send
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
