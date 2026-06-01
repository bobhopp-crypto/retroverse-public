"use client";

import { useCallback, useState } from "react";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { buildDiscogsSearchUrl } from "@/lib/cover-integrity/discogs-url";

import "./album-cover-curator.css";

type Props = {
  rval: string;
  albumTitle: string;
  artistName: string;
  releaseYear: number | null;
  coverUrl: string | null;
  onClose: () => void;
  onAccepted?: (coverUrl: string | null) => void;
};

export function AlbumCoverCuratorModal({
  rval,
  albumTitle,
  artistName,
  releaseYear,
  coverUrl,
  onClose,
  onAccepted,
}: Props) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const discogsUrl = buildDiscogsSearchUrl(artistName, albumTitle, releaseYear);

  const acceptCover = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      let rv12Id: string | null = null;
      const fileInput = document.getElementById("cover-curator-file") as HTMLInputElement | null;
      const file = fileInput?.files?.[0];

      if (file && file.size > 0) {
        const form = new FormData();
        form.set("file", file);
        form.set("sourceType", "upload");
        form.set("curatorNotes", `Public curator · ${rval} · ${albumTitle}`);
        form.set("actor", "public/cover-curator");
        const createRes = await fetch("/api/ops/covers/rv12/create", { method: "POST", body: form });
        const createBody = await createRes.json();
        if (!createRes.ok || !createBody.ok) {
          throw new Error(createBody.error ?? "Upload unavailable — enable Archive Ops.");
        }
        rv12Id = createBody.asset?.rv12Id ?? createBody.asset?.id ?? null;
      } else if (sourceUrl.trim()) {
        const createRes = await fetch("/api/ops/covers/rv12/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceUrl: sourceUrl.trim(),
            sourceType: "url",
            curatorNotes: `Public curator · ${rval}`,
            actor: "public/cover-curator",
          }),
        });
        const createBody = await createRes.json();
        if (!createRes.ok || !createBody.ok) {
          throw new Error(createBody.error ?? "Cover import unavailable.");
        }
        rv12Id = createBody.asset?.rv12Id ?? createBody.asset?.id ?? null;
      } else {
        throw new Error("Paste a cover URL or choose a file.");
      }

      if (!rv12Id) throw new Error("Could not stage cover asset.");

      const promoteRes = await fetch("/api/ops/covers/rv12/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rval,
          rv12Id,
          actor: "public/cover-curator",
          auditReason: `Public cover curator accept · ${albumTitle}`,
        }),
      });
      const promoteBody = await promoteRes.json();
      if (!promoteRes.ok || !promoteBody.ok) {
        throw new Error(promoteBody.error ?? promoteBody.message ?? "Could not apply cover.");
      }

      const nextCover = previewUrl ?? (sourceUrl.trim() || coverUrl);
      onAccepted?.(nextCover);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [albumTitle, coverUrl, onAccepted, onClose, previewUrl, rval, sourceUrl]);

  return (
    <div className="cover-curator-backdrop" role="presentation" onClick={onClose}>
      <div
        className="cover-curator-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cover-curator-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cover-curator-modal__head">
          <p className="cover-curator-modal__eyebrow">◎ Curator</p>
          <h2 id="cover-curator-title" className="cover-curator-modal__title">
            {albumTitle}
          </h2>
          <p className="cover-curator-modal__artist">{artistName}</p>
        </header>

        <div className="cover-curator-modal__grid">
          <div className="cover-curator-panel">
            <p className="cover-curator-panel__label">Current</p>
            <ArtistCover
              src={coverUrl}
              alt=""
              className="cover-curator-panel__img"
              fallbackClassName="cover-curator-panel__fallback"
              fallbackVariant="plate"
              plateDensity="compact"
              placeholderContext={{
                rval,
                artist: artistName,
                album: albumTitle,
                releaseYear,
              }}
            />
          </div>
          <div className="cover-curator-panel">
            <p className="cover-curator-panel__label">Candidate</p>
            {previewUrl || sourceUrl.trim() ? (
              <img
                src={previewUrl ?? sourceUrl.trim()}
                alt=""
                className="cover-curator-panel__img"
                onError={() => setPreviewUrl(null)}
              />
            ) : (
              <div className="cover-curator-panel__fallback" aria-hidden />
            )}
          </div>
        </div>

        <div className="cover-curator-modal__search">
          <label className="cover-curator-modal__field-label" htmlFor="cover-curator-url">
            Search cover
          </label>
          <div className="cover-curator-modal__search-row">
            <input
              id="cover-curator-url"
              type="url"
              className="cover-curator-modal__input"
              placeholder="Paste image URL"
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value);
                setPreviewUrl(e.target.value.trim() || null);
              }}
            />
            <a
              href={discogsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cover-curator-modal__discogs"
            >
              Discogs
            </a>
          </div>
          <label className="cover-curator-modal__field-label" htmlFor="cover-curator-file">
            Upload cover
          </label>
          <input id="cover-curator-file" type="file" accept="image/*" className="cover-curator-modal__file" />
        </div>

        {error ? (
          <p className="cover-curator-modal__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="cover-curator-modal__actions">
          <button type="button" className="cover-curator-modal__btn cover-curator-modal__btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="cover-curator-modal__btn cover-curator-modal__btn--accept"
            disabled={busy}
            onClick={() => void acceptCover()}
          >
            {busy ? "Applying…" : "Accept"}
          </button>
        </footer>
      </div>
    </div>
  );
}
