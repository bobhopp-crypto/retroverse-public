"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ActiveRequestEvent,
  OperatorRequest,
  RequestMoreNotice,
} from "@/lib/song-requests/types";

import "./song-request-operator.css";

type DashboardPayload = {
  event: ActiveRequestEvent | null;
  requests: OperatorRequest[];
  notices: RequestMoreNotice[];
};

async function json<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function SongRequestOperator() {
  const [dashboard, setDashboard] = useState<DashboardPayload>({ event: null, requests: [], notices: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    try {
      const next = await json<DashboardPayload>(
        await fetch("/api/ops/song-requests", { cache: "no-store" }),
      );
      setDashboard(next);
    } catch (reason) {
      setError("Requests are temporarily unavailable. Please try Refresh.");
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
    const timer = window.setInterval(() => void refreshDashboard(), 10_000);
    return () => window.clearInterval(timer);
  }, [refreshDashboard]);

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
      await refreshDashboard();
    } catch (reason) {
      setError("That request could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function noticeAction(noticeId: number, noticeAction: "replenishNotice" | "dismissNotice") {
    setBusy(true);
    setError(null);
    try {
      await json<{ ok: true }>(await fetch("/api/ops/song-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ noticeId, action: noticeAction }) }));
      await refreshDashboard();
    } catch { setError("That request could not be updated. Please try again."); }
    finally { setBusy(false); }
  }

  const pendingRequests = dashboard.requests.filter(
    (request) => request.status === "new" || request.status === "accepted",
  );

  return (
    <main className="request-ops">
      <header className="request-ops__header">
        <div>
          <p>Tonight</p>
          <h1>Song Requests</h1>
        </div>
        <button type="button" onClick={() => void refreshDashboard()}>Refresh</button>
      </header>

      {error ? <div className="request-ops__error">{error}</div> : null}

      {dashboard.notices.map((notice) => (
        <article className="request-notice" key={notice.id}>
          <strong>{notice.memberFirstName ?? "Guest"} is asking for another request</strong>
          <span>{notice.requestCount} request{notice.requestCount === 1 ? "" : "s"} available · {formatTime(notice.createdAt)}</span>
          <div><button type="button" disabled={busy} onClick={() => void noticeAction(notice.id, "replenishNotice")}>GIVE 1 MORE REQUEST</button><button type="button" disabled={busy} onClick={() => void noticeAction(notice.id, "dismissNotice")}>DISMISS</button></div>
        </article>
      ))}

      <section className="request-queue">
        <header>
          <div>
            <p>Active event</p>
            <h2>{dashboard.event?.title ?? "No active request event"}</h2>
          </div>
        </header>

        <div className="request-queue__list">
          {pendingRequests.length === 0 ? (
            <p className="request-queue__empty">No requests yet.</p>
          ) : null}
          {pendingRequests.map((request) => (
            <article className="request-card" data-status={request.status} key={request.id}>
              <div className="request-card__top">
                <time>{formatTime(request.requestedAt)}</time>
                <span>{request.status}</span>
              </div>
              <h3>{request.title}</h3>
              <p className="request-card__artist">
                {request.artist}{request.year ? ` · ${request.year}` : ""}
              </p>
              <div className="request-card__actions">
                <button type="button" disabled={busy || request.status !== "new"} onClick={() => void action(request.id, "accept")}>ACCEPT</button>
                <button type="button" disabled={busy || (request.status !== "new" && request.status !== "accepted")} onClick={() => void action(request.id, "skip")}>SKIP</button>
                <button type="button" disabled={busy || request.status !== "accepted"} onClick={() => void action(request.id, "played")}>PLAYED</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
