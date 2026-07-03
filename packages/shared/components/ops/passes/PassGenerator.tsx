"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildPassDisplay, chunkPasses, PASSES_PER_PAGE } from "@/lib/ops/passes/format";
import { PASS_STYLES, type PassDisplayData, type PassGeneratorForm } from "@/lib/ops/passes/types";

const DEFAULT_FORM: PassGeneratorForm = {
  title: "Sunday Nights",
  venue: "The Main Pub\n6th & Main\nFond du Lac, WI",
  date: "June 7, 2026",
  years: "1967, 1978, 1992",
  quantity: 20,
  style: "Festival Pass",
};

function PassCard(props: { data: PassDisplayData }) {
  const { data } = props;
  return (
    <article className="pass-card" aria-label={`${data.titleLine} pass`}>
      <div className="pass-card__frame">
        <p className="pass-card__years">{data.yearsLine}</p>
        <h2 className="pass-card__title">{data.titleLine}</h2>
        <p className="pass-card__date">{data.dateLine}</p>
        <div className="pass-card__venue">
          {data.venueLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="pass-card__style">{data.styleLine}</p>
        <p className="pass-card__number">
          No. <span className="pass-card__number-line" aria-hidden />
        </p>
      </div>
    </article>
  );
}

export function PassGenerator() {
  const [form, setForm] = useState<PassGeneratorForm>(DEFAULT_FORM);
  const [display, setDisplay] = useState<PassDisplayData | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shouldPrint, setShouldPrint] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shouldPrint || !display || quantity < 1) return;
    window.print();
    setShouldPrint(false);
  }, [shouldPrint, display, quantity]);

  const pages = useMemo(() => {
    if (!display || quantity < 1) return [];
    const slots = Array.from({ length: quantity }, (_, index) => index);
    return chunkPasses(slots, PASSES_PER_PAGE);
  }, [display, quantity]);

  const updateField = useCallback(<K extends keyof PassGeneratorForm>(key: K, value: PassGeneratorForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = useCallback(async () => {
    const qty = Math.max(1, Math.min(200, Math.round(form.quantity) || 1));
    setBusy(true);
    setStatus(null);

    try {
      const res = await fetch("/api/ops/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          venue: form.venue,
          date: form.date,
          years: form.years,
          style: form.style,
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "Archive save failed");
      }

      setDisplay(buildPassDisplay(form));
      setQuantity(qty);
      setStatus(`Saved · ${qty} passes ready to print`);
      setShouldPrint(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }, [form]);

  return (
    <div className="pass-gen">
      <section className="pass-gen__form-panel">
        <h2 className="pass-gen__heading">Pass details</h2>
        <div className="pass-gen__form">
          <label className="pass-gen__field">
            <span>Event Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </label>

          <label className="pass-gen__field">
            <span>Venue</span>
            <textarea
              rows={3}
              value={form.venue}
              onChange={(event) => updateField("venue", event.target.value)}
            />
          </label>

          <label className="pass-gen__field">
            <span>Date</span>
            <input
              type="text"
              value={form.date}
              onChange={(event) => updateField("date", event.target.value)}
            />
          </label>

          <label className="pass-gen__field">
            <span>Years Featured</span>
            <input
              type="text"
              value={form.years}
              onChange={(event) => updateField("years", event.target.value)}
            />
          </label>

          <label className="pass-gen__field pass-gen__field--narrow">
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              max={200}
              value={form.quantity}
              onChange={(event) => updateField("quantity", Number(event.target.value) || 1)}
            />
          </label>

          <label className="pass-gen__field pass-gen__field--narrow">
            <span>Style</span>
            <select value={form.style} onChange={(event) => updateField("style", event.target.value as PassGeneratorForm["style"])}>
              {PASS_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pass-gen__actions">
          <button type="button" className="ops-btn ops-btn--ok" disabled={busy} onClick={() => void handleGenerate()}>
            {busy ? "Generating…" : "Generate pass sheet"}
          </button>
          {display ? (
            <button type="button" className="ops-btn ops-btn--info" onClick={() => window.print()}>
              Print again
            </button>
          ) : null}
        </div>

        {status ? <p className="pass-gen__status">{status}</p> : null}
        <p className="pass-gen__hint">
          Numbers are written by hand after printing. Each sheet holds {PASSES_PER_PAGE} passes on US Letter.
        </p>
      </section>

      {display && quantity > 0 ? (
        <div className="pass-gen__preview-wrap">
          <p className="pass-gen__preview-label">Print preview</p>
          <div ref={sheetRef} className="pass-gen__sheets">
            {pages.map((page, pageIndex) => (
              <div key={pageIndex} className="pass-sheet">
                {page.map((slot) => (
                  <PassCard key={slot} data={display} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
