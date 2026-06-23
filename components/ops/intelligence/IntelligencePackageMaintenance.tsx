"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { PackageDiagnostics } from "@/lib/ops/intelligence/package-diagnostics";

type Props = {
  rvtr: string;
  diagnostics: PackageDiagnostics;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="intel-diagnostic-field">
      <p className="intel-diagnostic-field__label">{label}</p>
      <p className="intel-diagnostic-field__value">{value || "—"}</p>
    </div>
  );
}

export function IntelligencePackageMaintenance({ rvtr, diagnostics }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"delete" | "rebuild" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function deletePackage() {
    const confirmed = window.confirm(`Delete Song Package ${rvtr}? This removes the package JSON and index entry.`);
    if (!confirmed) return;

    setBusy("delete");
    setMessage(null);
    try {
      const res = await fetch(`/api/ops/intelligence/${rvtr}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.push("/ops/intelligence");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed.");
      setBusy(null);
    }
  }

  async function rebuildPackage() {
    const confirmed = window.confirm(`Rebuild Song Package ${rvtr}? This deletes the current package and runs processSong().`);
    if (!confirmed) return;

    setBusy("rebuild");
    setMessage(null);
    try {
      const res = await fetch(`/api/ops/intelligence/${rvtr}`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setMessage("Rebuild complete.");
      router.refresh();
      window.location.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Rebuild failed.");
      setBusy(null);
    }
  }

  return (
    <section className="intel-package-section intel-package-section--maintenance">
      <div className="intel-maintenance-head">
        <div>
          <h2 className="intel-package-section__title">Package Maintenance</h2>
          <p className="intel-package-section__lead">
            Diagnose, rebuild, or remove this existing Song Package.
          </p>
        </div>
        <div className="intel-maintenance-actions">
          <button
            type="button"
            className="intel-btn"
            disabled={busy !== null}
            onClick={rebuildPackage}
          >
            {busy === "rebuild" ? "Rebuilding…" : "Rebuild Package"}
          </button>
          <button
            type="button"
            className="intel-btn intel-btn--danger"
            disabled={busy !== null}
            onClick={deletePackage}
          >
            {busy === "delete" ? "Deleting…" : "Delete Package"}
          </button>
        </div>
      </div>

      {message ? (
        <p className="intel-review__flash" role="status">
          {message}
        </p>
      ) : null}

      <div className="intel-diagnostics-grid">
        <Field label="RVTR" value={diagnostics.rvtr} />
        <Field label="Canonical Artist" value={diagnostics.canonicalArtist} />
        <Field label="Canonical Title" value={diagnostics.canonicalTitle} />
        <Field label="VDJ Artist" value={diagnostics.vdjArtist ?? "—"} />
        <Field label="VDJ Title" value={diagnostics.vdjTitle ?? "—"} />
        <Field label="Match Method" value={diagnostics.matchMethod} />
        <Field label="Cover Present" value={diagnostics.coverPresent ? "Y" : "N"} />
      </div>
    </section>
  );
}
