"use client";

import { useCallback, useEffect, useState } from "react";

import type { RepairBatchCsvRow } from "@/lib/cover-integrity/load-repair-batch-csv";

type Rv12Asset = {
  rv12Id: string;
  contentHash: string;
  sourceType: string;
  localPath: string;
  width: number | null;
  height: number | null;
};

type Props = {
  row: RepairBatchCsvRow;
  coverApplyEnabled: boolean;
  isPilot: boolean;
};

export function OpsCoverRv12Actions({ row, coverApplyEnabled, isPilot }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [candidate, setCandidate] = useState<Rv12Asset | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forceTrusted, setForceTrusted] = useState(false);
  const [forceReason, setForceReason] = useState("");

  const refreshState = useCallback(async () => {
    const res = await fetch(`/api/ops/covers/rv12/state?rval=${encodeURIComponent(row.rval)}`);
    const data = (await res.json()) as {
      assets?: Rv12Asset[];
      activeAssignment?: { rv12Id: string };
      promotionAudit?: { action: string; ok: boolean; message: string }[];
    };
    if (data.assets?.length) {
      const last = data.assets[data.assets.length - 1]!;
      setCandidate(last);
    }
  }, [row.rval]);

  useEffect(() => {
    void refreshState();
  }, [refreshState, row.rval]);

  const createAsset = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.set("actor", "ops/covers-ui");
      form.set("curatorNotes", `pilot ${row.rval}`);
      if (file) {
        form.set("file", file);
        form.set("sourceType", "upload");
      } else if (imageUrl.trim()) {
        form.set("sourceUrl", imageUrl.trim());
        form.set("sourceType", /discogs\.com/i.test(imageUrl) ? "discogs" : "url");
      } else {
        throw new Error("Upload a file or paste an image / Discogs URL");
      }
      const res = await fetch("/api/ops/covers/rv12/create", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { ok?: boolean; asset?: Rv12Asset; error?: string };
      if (!res.ok || !data.ok || !data.asset) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setCandidate(data.asset);
      setStatus(`Created ${data.asset.rv12Id} · hash ${data.asset.contentHash.slice(0, 12)}…`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const promote = async () => {
    if (!candidate) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/ops/covers/rv12/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rval: row.rval,
          rv12Id: candidate.rv12Id,
          trustTier: row.trustTier,
          forceTrustedOverride: forceTrusted,
          forceReason: forceReason || null,
          auditReason: row.issueReason,
          actor: "ops/covers-ui",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; newHash?: string };
      if (!res.ok || !data.ok) {
        throw new Error((data as { message?: string }).message ?? `HTTP ${res.status}`);
      }
      setStatus(`Promoted · new hash ${data.newHash?.slice(0, 12) ?? "—"}…`);
      await refreshState();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const rollback = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/ops/covers/rv12/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rval: row.rval, actor: "ops/covers-ui" }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error((data as { message?: string }).message ?? `HTTP ${res.status}`);
      }
      setStatus("Rollback complete — prior cover restored from backup");
      await refreshState();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const candidateThumb = candidate
    ? `/api/ops/covers/rv12/thumbnail?rv12Id=${encodeURIComponent(candidate.rv12Id)}`
    : null;

  return (
    <section className="ops-cover-rv12">
      <h3 className="ops-cover-rv12__title">RV12 pilot · canonical assignment</h3>
      {!isPilot ? (
        <p className="ops-dim">Promotion locked — pilot is RVAL823723 only.</p>
      ) : null}
      {!coverApplyEnabled ? (
        <p className="ops-cover-rv12__warn">
          <strong>RETROVERSE_COVER_APPLY=0</strong> — create/preview only; promote & rollback disabled.
        </p>
      ) : null}

      <div className="ops-cover-rv12__ingest">
        <label>
          Paste image or Discogs URL
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… or https://www.discogs.com/release/…"
          />
        </label>
        <label>
          Upload image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="button" className="ops-cover-review__btn" disabled={busy} onClick={() => void createAsset()}>
          Create RV12 asset
        </button>
      </div>

      {candidate ? (
        <div className="ops-cover-rv12__candidate">
          <p>
            <strong>{candidate.rv12Id}</strong> · {candidate.contentHash.slice(0, 16)}…
            {candidate.width ? ` · ${candidate.width}×${candidate.height}` : ""}
          </p>
          <div className="ops-cover-rv12__preview-row">
            <figure>
              <figcaption>Candidate</figcaption>
              {candidateThumb ? (
                <img
                  className="ops-cover-art__img ops-cover-rv12__candidate-img"
                  src={candidateThumb}
                  alt=""
                />
              ) : null}
            </figure>
          </div>
        </div>
      ) : null}

      {row.trustTier === "TRUSTED" ? (
        <label className="ops-cover-rv12__force">
          <input
            type="checkbox"
            checked={forceTrusted}
            onChange={(e) => setForceTrusted(e.target.checked)}
          />
          Force TRUSTED override
          <input
            type="text"
            value={forceReason}
            onChange={(e) => setForceReason(e.target.value)}
            placeholder="Reason required"
          />
        </label>
      ) : null}

      <div className="ops-cover-rv12__promote-actions">
        <button
          type="button"
          className="ops-cover-review__btn ops-cover-review__btn--approve"
          disabled={busy || !coverApplyEnabled || !isPilot || !candidate}
          onClick={() => void promote()}
        >
          Promote to Canonical
        </button>
        <button
          type="button"
          className="ops-cover-review__btn ops-cover-review__btn--reject"
          disabled={busy || !coverApplyEnabled || !isPilot}
          onClick={() => void rollback()}
        >
          Rollback last promote
        </button>
      </div>

      {status ? <p className="ops-cover-rv12__status">{status}</p> : null}
      <p className="ops-dim ops-cover-rv12__ledger">
        Ledger: RETROVERSE_DATA/ops/rv12/ · audit in promotion_audit.jsonl
      </p>
    </section>
  );
}
