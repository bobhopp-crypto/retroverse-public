"use client";

import { useEffect, useState, useTransition } from "react";

import {
  assignHeroFromLocalPath,
  assignHeroFromUpload,
  fetchHeroGeneratorState,
  submitHeroRequest,
} from "@/app/bobos/bridge/hero-actions";
import type { BridgeSongModel } from "@/lib/bobos/bridge/types";
import type { HeroRequest } from "@/lib/bobos/hero/types";

type Props = {
  rvtr: string;
  open: boolean;
  onClose: () => void;
  onAssigned: (model: BridgeSongModel) => void;
};

export function HeroGeneratorModal({ rvtr, open, onClose, onAssigned }: Props) {
  const [prompt, setPrompt] = useState("");
  const [request, setRequest] = useState<HeroRequest | null>(null);
  const [localPath, setLocalPath] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setMessage(null);

    startTransition(async () => {
      const state = await fetchHeroGeneratorState(rvtr);
      if (cancelled || !state) return;
      setPrompt(state.prompt);
      setRequest(state.request);
    });

    return () => {
      cancelled = true;
    };
  }, [open, rvtr]);

  if (!open) return null;

  function createRequest() {
    startTransition(async () => {
      try {
        const result = await submitHeroRequest(rvtr, prompt);
        setRequest(result.request);
        setMessage("Hero request created — awaiting renderer.");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Request failed.");
      }
    });
  }

  function assignPath() {
    if (!localPath.trim()) return;
    startTransition(async () => {
      try {
        const result = await assignHeroFromLocalPath(rvtr, localPath);
        setRequest(result.request);
        if (result.model) {
          onAssigned(result.model);
          onClose();
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Assign failed.");
      }
    });
  }

  function assignUpload(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await assignHeroFromUpload(rvtr, formData);
        setRequest(result.request);
        if (result.model) {
          onAssigned(result.model);
          onClose();
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  return (
    <div className="bridge-hero-gen-backdrop" onClick={onClose}>
      <div
        className="bridge-hero-gen"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Hero Generator"
      >
        <header className="bridge-hero-gen__head">
          <h2>Generate Hero</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="bridge-hero-gen__spec">Portrait · 9:16 · 1080×1920 · No text · No logos</p>

        <label className="bridge-hero-gen__label">
          Hero Prompt
          <textarea
            className="bridge-hero-gen__prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={14}
            spellCheck={false}
          />
        </label>

        <div className="bridge-hero-gen__actions">
          <button
            type="button"
            className="bridge-toolbar__btn bridge-toolbar__btn--primary"
            disabled={pending || !prompt.trim()}
            onClick={createRequest}
          >
            Create Hero Request
          </button>
        </div>

        {request ? (
          <section className="bridge-hero-gen__request">
            <h3>Hero Request</h3>
            <dl>
              <div>
                <dt>Song</dt>
                <dd>
                  {request.songTitle} · {request.artist}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{request.status}</dd>
              </div>
              <div>
                <dt>Output Path</dt>
                <dd>{request.outputPath}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(request.createdAt).toLocaleString()}</dd>
              </div>
              {request.outputUrl ? (
                <div>
                  <dt>Assigned URL</dt>
                  <dd>{request.outputUrl}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        <section className="bridge-hero-gen__assign">
          <h3>Assign Portrait (Manual v0.1)</h3>
          <p className="bridge-hero-gen__hint">
            Until a renderer exists, assign a local 9:16 portrait image as Primary Hero.
          </p>

          <form
            action={(formData) => assignUpload(formData)}
            className="bridge-hero-gen__upload"
          >
            <input type="file" name="file" accept="image/jpeg,image/png,image/webp" />
            <button type="submit" className="bridge-toolbar__btn" disabled={pending}>
              Upload & Assign
            </button>
          </form>

          <div className="bridge-hero-gen__path">
            <input
              type="text"
              placeholder="/absolute/path/to/hero.jpg"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
            />
            <button
              type="button"
              className="bridge-toolbar__btn"
              disabled={pending || !localPath.trim()}
              onClick={assignPath}
            >
              Assign from Path
            </button>
          </div>
        </section>

        {message ? <p className="bridge-hero-gen__message">{message}</p> : null}
      </div>
    </div>
  );
}
