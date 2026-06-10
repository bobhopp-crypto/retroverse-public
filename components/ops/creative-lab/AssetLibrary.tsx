"use client";

import { useMemo, useState } from "react";

import { FINAL_ASSET_SLOTS, FINAL_SLOT_LABELS } from "@/lib/ops/creative-lab/types";
import type {
  ConceptVariationKey,
  CreativeLabAsset,
  CreativeLabAssetStatus,
  CreativeLabAssetType,
  CreativeLabProjectFile,
  FinalAssetSlot,
} from "@/lib/ops/creative-lab/types";

type Props = {
  project: CreativeLabProjectFile;
  busy: boolean;
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onSetFinal: (assetId: string, slot: FinalAssetSlot) => void;
};

const STATUS_ORDER: CreativeLabAssetStatus[] = ["final", "approved", "generated", "rejected"];

export function AssetLibrary(props: Props) {
  const { project, busy, onApprove, onReject, onSetFinal } = props;
  const [statusFilter, setStatusFilter] = useState<CreativeLabAssetStatus | "all">("all");
  const [conceptFilter, setConceptFilter] = useState<ConceptVariationKey | "all">("all");
  const [typeFilter, setTypeFilter] = useState<CreativeLabAssetType | "all">("all");

  const filtered = useMemo(() => {
    return project.assets.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (conceptFilter !== "all" && a.concept !== conceptFilter) return false;
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      return true;
    });
  }, [project.assets, statusFilter, conceptFilter, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<CreativeLabAssetStatus, CreativeLabAsset[]>();
    for (const status of STATUS_ORDER) map.set(status, []);
    for (const asset of filtered) {
      const list = map.get(asset.status) ?? [];
      list.push(asset);
      map.set(asset.status, list);
    }
    return map;
  }, [filtered]);

  return (
    <section className="cl-asset-library">
      <header className="cl-asset-library__filters">
        <label>
          Status
          <select
            className="ops-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CreativeLabAssetStatus | "all")}
          >
            <option value="all">All</option>
            <option value="generated">Generated</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="final">Final</option>
          </select>
        </label>
        <label>
          Concept
          <select
            className="ops-input"
            value={conceptFilter}
            onChange={(e) => setConceptFilter(e.target.value as ConceptVariationKey | "all")}
          >
            <option value="all">All</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>
        <label>
          Type
          <select className="ops-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as CreativeLabAssetType | "all")}>
            <option value="all">All</option>
            <option value="pass-front">Pass front</option>
            <option value="pass-back">Pass back</option>
            <option value="poster">Poster</option>
            <option value="bumper">Bumper</option>
            <option value="credential">Credential</option>
            <option value="card">Card</option>
            <option value="magazine">Magazine</option>
          </select>
        </label>
      </header>

      <div className="cl-asset-library__finals">
        <h4>Current winners</h4>
        <ul>
          {FINAL_ASSET_SLOTS.map((slot) => {
            const assetId = project.finalAssetSlots[slot];
            const asset = assetId ? project.assets.find((a) => a.id === assetId) : null;
            return (
              <li key={slot}>
                <strong>{FINAL_SLOT_LABELS[slot]}</strong>
                <span>{asset ? `${asset.concept ?? "—"} · ${asset.id}` : "—"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {STATUS_ORDER.map((status) => {
        const rows = grouped.get(status) ?? [];
        if (!rows.length) return null;
        return (
          <section key={status} className="cl-asset-library__group">
            <h4 className={`cl-asset-status cl-asset-status--${status}`}>{status}</h4>
            <ul className="cl-asset-library__list">
              {rows.map((asset) => (
                <li key={asset.id} className="cl-asset-card">
                  <div
                    className="cl-asset-card__thumb"
                    style={{
                      background: `linear-gradient(135deg, hsl(${(asset.concept?.charCodeAt(0) ?? 65) * 3} 50% 62%), hsl(${(asset.type.length * 17) % 360} 42% 40%))`,
                    }}
                    aria-hidden
                  >
                    <span>{asset.concept ?? "?"}</span>
                  </div>
                  <div className="cl-asset-card__body">
                    <strong>{asset.type}</strong>
                    <span className="ops-dim">
                      Concept {asset.concept ?? "—"} · {asset.id}
                    </span>
                    <span className="ops-dim">{asset.filePath ?? "no file"}</span>
                    {asset.notes ? <p className="cl-asset-card__notes">{asset.notes.slice(0, 120)}</p> : null}
                    <div className="cl-asset-card__actions">
                      <button type="button" className="ops-btn ops-btn--ok" disabled={busy} onClick={() => onApprove(asset.id)}>
                        Approve
                      </button>
                      <button type="button" className="ops-btn" disabled={busy} onClick={() => onReject(asset.id)}>
                        Reject
                      </button>
                      <select
                        className="ops-input"
                        defaultValue=""
                        disabled={busy}
                        onChange={(e) => {
                          const slot = e.target.value as FinalAssetSlot;
                          if (slot) onSetFinal(asset.id, slot);
                          e.target.value = "";
                        }}
                      >
                        <option value="">Set as final…</option>
                        {FINAL_ASSET_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {FINAL_SLOT_LABELS[slot]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {!filtered.length ? <p className="ops-dim">No assets match filters. Generate concepts in Pass Lab first.</p> : null}
    </section>
  );
}
