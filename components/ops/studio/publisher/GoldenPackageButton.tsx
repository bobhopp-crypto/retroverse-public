"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  rvtr: string;
  isGolden: boolean;
  approved: boolean;
};

export function GoldenPackageButton({ rvtr, isGolden, approved }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isGolden) {
    return (
      <p className="rs-exp-golden rs-exp-golden--locked">
        ⭐ Golden Package — frozen exemplar. Director will not regenerate this experience.
      </p>
    );
  }

  if (!approved) return null;

  async function promote() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/studio/publisher/${rvtr}/golden`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publisherComment: "Promoted to permanent Retroverse collection",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "promote_failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promote failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rs-exp-golden">
      <button type="button" className="rs-exp-golden__btn" disabled={busy} onClick={promote}>
        {busy ? "Promoting…" : "⭐ Promote to Golden Package"}
      </button>
      <p className="rs-exp-golden__hint">Freezes this experience as a Director training exemplar.</p>
      {error ? <p className="rs-exp-golden__error">{error}</p> : null}
    </div>
  );
}
