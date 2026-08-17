"use client";

import { FormEvent, useState } from "react";

export function VideoDownloader() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setBusy(true);
    setStatus("Starting download…");

    try {
      const response = await fetch("/api/bobos/video-downloader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const payload = await response.json();
      setStatus(payload.message || (response.ok ? "Download finished." : "Download failed."));
    } catch {
      setStatus("Download request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#111", color: "#f5f5f5", padding: "48px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontSize: 14, opacity: 0.65, letterSpacing: "0.12em", marginBottom: 8 }}>RV06-04</div>
        <h1 style={{ fontSize: 42, margin: "0 0 8px" }}>Video Downloader</h1>
        <p style={{ margin: "0 0 32px", color: "#bbb", fontSize: 18 }}>
          Paste a YouTube URL. Downloads are saved to your Mac Downloads folder at 720p or lower using your Chrome session.
        </p>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            inputMode="url"
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", borderRadius: 12, border: "1px solid #444", background: "#1b1b1b", color: "#fff", padding: "18px 16px", fontSize: 18 }}
          />
          <button
            type="submit"
            disabled={busy || !url.trim()}
            style={{ border: 0, borderRadius: 12, padding: "16px 18px", fontSize: 18, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy || !url.trim() ? 0.55 : 1 }}
          >
            {busy ? "Downloading…" : "Download 720p"}
          </button>
        </form>

        {status ? <p style={{ marginTop: 22, color: "#ddd", whiteSpace: "pre-wrap" }}>{status}</p> : null}
      </div>
    </main>
  );
}
