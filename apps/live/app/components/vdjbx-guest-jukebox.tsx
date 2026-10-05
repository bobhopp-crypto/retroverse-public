"use client";

import { useEffect, useMemo, useState } from "react";

import { GuestBrowser, type GuestQueueRow, type GuestShelf, type GuestSong } from "./guest-browser";
import { StageSongDetail, toStageSong } from "./stage-song-detail";
import { playlistShelves, uniquePlaylistVideos, videoForIdentity } from "@/lib/vdjbx-catalog";

import "./retroverse-stage.css";

const SESSION_REQUESTS_KEY = "retroverse:guest-jukebox:requests";

function readSessionRequests(): GuestQueueRow[] {
  try {
    const rows = JSON.parse(sessionStorage.getItem(SESSION_REQUESTS_KEY) || "[]") as GuestQueueRow[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export function VdjbxGuestJukebox() {
  const videos = useMemo(() => uniquePlaylistVideos(), []);
  const shelves: GuestShelf[] = useMemo(
    () => playlistShelves().map((shelf) => ({ displayName: shelf.displayName, videos: shelf.videos, itemCount: shelf.videos.length })),
    [],
  );
  const catalog = useMemo(() => ({ videos, shelves, totalVideos: videos.length }), [videos, shelves]);
  const [query, setQuery] = useState("");
  const [showQueue, setShowQueue] = useState(false);
  const [requests, setRequests] = useState<GuestQueueRow[]>([]);
  const [message, setMessage] = useState("");
  const [detailSong, setDetailSong] = useState<GuestSong | null>(null);
  const [pendingKey, setPendingKey] = useState("");
  const queueByKey = useMemo(() => new Map(requests.map((row) => [row.videoKey, row])), [requests]);
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return [];
    return videos.filter((video) => `${video.title} ${video.artist}`.toLocaleLowerCase().includes(needle));
  }, [query, videos]);

  useEffect(() => {
    setRequests(readSessionRequests());
    const onRequestSubmitted = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; artist?: string }>).detail;
      const title = detail?.title?.trim() || "";
      const artist = detail?.artist?.trim() || "";
      if (!title || !artist) return;
      const match = videoForIdentity(artist, title);
      const row: GuestQueueRow = {
        position: undefined,
        videoKey: match?.videoKey || `submitted:${artist}:${title}`,
        title,
        artist,
      };
      setRequests((current) => {
        const next = current.some((item) => item.videoKey === row.videoKey) ? current : [...current, row];
        try { sessionStorage.setItem(SESSION_REQUESTS_KEY, JSON.stringify(next)); } catch { /* keep in memory */ }
        return next;
      });
      setMessage(`${title} was added to your requests.`);
    };
    window.addEventListener("retroverse:live-request-submitted", onRequestSubmitted);
    return () => window.removeEventListener("retroverse:live-request-submitted", onRequestSubmitted);
  }, []);

  const openRequestPicker = (song: GuestSong) => {
    setPendingKey(song.videoKey);
    setDetailSong(null);
    setMessage("");
    window.dispatchEvent(new CustomEvent("retroverse:open-live-request", { detail: { query: song.title } }));
    window.setTimeout(() => setPendingKey(""), 250);
  };

  return (
    <>
      <GuestBrowser
        catalog={catalog}
        query={query}
        results={results}
        searching={false}
        message={message}
        queueByKey={queueByKey}
        onQuery={setQuery}
        onOpenDetail={setDetailSong}
        onQueue={() => setShowQueue(true)}
        credits={<a className="guest-live-link" href="/">← RETURN TO LIVE</a>}
      />
      {showQueue ? (
        <div className="guest-queue-layer" role="presentation" onClick={() => setShowQueue(false)}>
          <section className="guest-queue-panel" role="dialog" aria-label="Your requests" onClick={(event) => event.stopPropagation()}>
            <h2>Your requests</h2>
            {requests.length ? <ol>{requests.map((row) => <li key={row.videoKey}>{row.title} — {row.artist}</li>)}</ol> : <p>No requests yet.</p>}
            <button className="guest-back" type="button" onClick={() => setShowQueue(false)}>Close</button>
          </section>
        </div>
      ) : null}
      {detailSong ? (
        <StageSongDetail
          song={toStageSong(detailSong)}
          mode="jukebox"
          requestsEnabled
          queuePosition={queueByKey.get(detailSong.videoKey)?.position}
          pending={pendingKey === detailSong.videoKey}
          onClose={() => setDetailSong(null)}
          onRequest={(song) => openRequestPicker({ ...detailSong, ...song, year: song.year ?? detailSong.year })}
        />
      ) : null}
    </>
  );
}
