"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { previewProductionLayoutBack, saveProductionLayout } from "@/app/bobos/pass-workspace/actions";
import { BOBOS_PASS_ASPECT_RATIO } from "@/lib/bobos/project-zero/pass-production-spec";
import type { PassWorkspaceTemplate } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import {
  clampProductionLayout,
  FINISHED_CANVAS,
  productionRectToRawPercent,
  qrSquareRect,
  safeAreaInsetPercent,
  type ProductionLayout,
  type ProductionRect,
} from "@/lib/bobos/project-zero/production-layout";
import {
  PRODUCTION_LAYOUT_PRESETS,
  productionLayoutPresetById,
} from "@/lib/bobos/project-zero/production-layout-presets";
import { PASS_WORKSPACE_SLUGS, type PassWorkspaceSlug } from "@/lib/bobos/project-zero/pass-workspace-slugs";

const PASS_LABEL_BY_SLUG: Record<PassWorkspaceSlug, string> = {
  general: "General",
  vip: "VIP",
  backstage: "Backstage",
};

type DragTarget = "qr" | "serial";

type DragState = {
  target: DragTarget;
  mode: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  /** For QR this is the square rect (width === size fraction). */
  startRect: ProductionRect;
};

type Props = {
  projectId: string;
  templates: PassWorkspaceTemplate[];
  /** Which pass type's layout is being edited — each pass stores its own layout. */
  activeSlug: PassWorkspaceSlug;
  onActiveSlugChange: (slug: PassWorkspaceSlug) => void;
  savedLayouts: Record<PassWorkspaceSlug, ProductionLayout>;
  draftLayouts: Record<PassWorkspaceSlug, ProductionLayout>;
  onDraftChange: (slug: PassWorkspaceSlug, layout: ProductionLayout) => void;
  onSaved: (slug: PassWorkspaceSlug, layout: ProductionLayout) => void;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function layoutsEqual(a: ProductionLayout, b: ProductionLayout): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function LayoutZoneOverlay(props: {
  label: string;
  rect: ProductionRect;
  tone: "qr" | "serial";
  editing: boolean;
  onMoveStart: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLSpanElement>) => void;
}) {
  const { label, rect, tone, editing, onMoveStart, onResizeStart } = props;
  const box = productionRectToRawPercent(rect);

  return (
    <span
      className={`pzw-prod__zone pzw-prod__zone--${tone}${editing ? " is-editing" : ""}`}
      style={{
        left: `${box.leftPct}%`,
        top: `${box.topPct}%`,
        width: `${box.widthPct}%`,
        height: `${box.heightPct}%`,
      }}
      onPointerDown={onMoveStart}
    >
      <span className="pzw-prod__zone-label">{label}</span>
      {editing ? (
        <span className="pzw-prod__resize-handle" onPointerDown={onResizeStart} aria-hidden />
      ) : null}
    </span>
  );
}

export function ProductionLayoutEditor({
  projectId,
  templates,
  activeSlug,
  onActiveSlugChange,
  savedLayouts,
  draftLayouts,
  onDraftChange,
  onSaved,
}: Props) {
  const [activePresetId, setActivePresetId] = useState<string>("custom");
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savedLayout = savedLayouts[activeSlug];
  const draftLayout = draftLayouts[activeSlug];

  // Preview always shows the pass whose layout is being edited.
  const previewTemplate = templates.find((t) => t.slug === activeSlug) ?? templates[0];
  const isDirty = useMemo(() => !layoutsEqual(savedLayout, draftLayout), [savedLayout, draftLayout]);
  const safeInset = safeAreaInsetPercent(draftLayout.safeArea);
  const activeLabel = PASS_LABEL_BY_SLUG[activeSlug];

  useEffect(() => {
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      if (previewTimer.current) clearTimeout(previewTimer.current);
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
    };
  }, []);

  const refreshPreview = useCallback(async () => {
    const generationId = previewTemplate?.generationId;
    if (!generationId || !previewTemplate) {
      setPreviewUrl(null);
      setPreviewError(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewProductionLayoutBack({
        projectId,
        generationId,
        slug: previewTemplate.slug,
        layout: draftLayout,
      });
      setPreviewUrl(result.dataUrl);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [draftLayout, previewTemplate, projectId]);

  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      void refreshPreview();
    }, 350);
  }, [refreshPreview]);

  const applyDraft = useCallback(
    (next: ProductionLayout) => {
      const clamped = clampProductionLayout(next);
      setActivePresetId("custom");
      onDraftChange(activeSlug, clamped);
    },
    [activeSlug, onDraftChange],
  );

  function handleSlugChange(slug: PassWorkspaceSlug) {
    if (slug === activeSlug) return;
    dragRef.current = null;
    setActivePresetId("custom");
    onActiveSlugChange(slug);
  }

  function pointerToNormalized(event: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    const rawX = ((event.clientX - rect.left) / rect.width) * FINISHED_CANVAS.rawWidthPx;
    const rawY = ((event.clientY - rect.top) / rect.height) * FINISHED_CANVAS.rawHeightPx;
    const finishedX = rawX - FINISHED_CANVAS.cropLeftPx;
    return {
      x: clamp01(finishedX / FINISHED_CANVAS.widthPx),
      y: clamp01(rawY / FINISHED_CANVAS.heightPx),
    };
  }

  function scheduleLayoutUpdate(updater: (current: ProductionLayout) => ProductionLayout) {
    if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      applyDraft(updater(draftLayout));
    });
  }

  function startRectFor(target: DragTarget): ProductionRect {
    return target === "qr" ? qrSquareRect(draftLayout.qr) : draftLayout.serial;
  }

  function startMove(target: DragTarget, event: ReactPointerEvent<HTMLSpanElement>) {
    if (!editing) return;
    const point = pointerToNormalized(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      target,
      mode: "move",
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      startRect: startRectFor(target),
    };
  }

  function startResize(target: DragTarget, event: ReactPointerEvent<HTMLSpanElement>) {
    if (!editing) return;
    const point = pointerToNormalized(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      target,
      mode: "resize",
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      startRect: startRectFor(target),
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = pointerToNormalized(event);
    if (!point) return;

    if (drag.mode === "move") {
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      scheduleLayoutUpdate((current) => {
        const patch = { x: clamp01(drag.startRect.x + dx), y: clamp01(drag.startRect.y + dy) };
        return drag.target === "qr"
          ? { ...current, qr: { ...current.qr, ...patch } }
          : { ...current, serial: { ...current.serial, ...patch } };
      });
      return;
    }

    const dx = (point.x - drag.startX) * 2;
    const dy = (point.y - drag.startY) * 2;
    scheduleLayoutUpdate((current) => {
      if (drag.target === "qr") {
        // The QR reserve is always square — one delta scales both dimensions equally.
        const size = clamp01(drag.startRect.width + Math.max(dx, dy));
        return { ...current, qr: { ...current.qr, size } };
      }
      const patch = { width: clamp01(drag.startRect.width + dx), height: clamp01(drag.startRect.height + dy) };
      return { ...current, serial: { ...current.serial, ...patch } };
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
  }

  function handlePresetSelect(presetId: string) {
    setActivePresetId(presetId);
  }

  function handleResetToPreset() {
    const preset = productionLayoutPresetById(activePresetId);
    if (!preset) return;
    applyDraft(preset.layout);
  }

  function handleRevert() {
    onDraftChange(activeSlug, savedLayout);
    setActivePresetId("custom");
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Saves ONLY the currently selected pass — other pass layouts are never touched.
      const saved = await saveProductionLayout(projectId, activeSlug, draftLayout);
      onSaved(activeSlug, saved);
      setSavedFlash(true);
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
      savedFlashTimer.current = setTimeout(() => setSavedFlash(false), 4000);
    } finally {
      setSaving(false);
    }
  }

  function updateQr<K extends keyof ProductionLayout["qr"]>(key: K, value: ProductionLayout["qr"][K]) {
    applyDraft({ ...draftLayout, qr: { ...draftLayout.qr, [key]: value } });
  }

  function updateSerial<K extends keyof ProductionLayout["serial"]>(
    key: K,
    value: ProductionLayout["serial"][K],
  ) {
    applyDraft({ ...draftLayout, serial: { ...draftLayout.serial, [key]: value } });
  }

  function updateSafeArea<K extends keyof ProductionLayout["safeArea"]>(
    key: K,
    value: ProductionLayout["safeArea"][K],
  ) {
    applyDraft({ ...draftLayout, safeArea: { ...draftLayout.safeArea, [key]: value } });
  }

  return (
    <section className={`pzw-prod${isDirty ? " pzw-prod--dirty" : ""}`}>
      <header className="pzw-prod__head">
        <div>
          <h2 className="pzw-prod__title">3 · Production Layout</h2>
          <p className="pzw-prod__hint">
            Each pass type keeps its own layout. Drag the QR code and serial number where
            they should sit on the back of every {activeLabel} pass — the preview shows
            exactly what will print.
          </p>
          {isDirty ? <p className="pzw-prod__dirty-badge">Unsaved changes — {activeLabel}</p> : null}
          {savedFlash ? <p className="pzw-prod__saved-badge">✓ {activeLabel} Layout Saved</p> : null}
        </div>
        <div className="pzw-prod__head-actions">
          <label className="pzw-prod__field pzw-prod__field--inline">
            <span>Preset</span>
            <select value={activePresetId} onChange={(event) => handlePresetSelect(event.target.value)}>
              <option value="custom">Custom</option>
              {PRODUCTION_LAYOUT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`ps-btn ps-btn--hero${editing ? " ps-btn--primary" : ""}`}
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "Editing On" : "Editing Off"}
          </button>
        </div>
      </header>

      <div className="pzw-prod__pass-picker" role="group" aria-label="Editing layout for">
        <span className="pzw-prod__pass-picker-label">Editing Layout For:</span>
        {PASS_WORKSPACE_SLUGS.map((slug) => (
          <button
            key={slug}
            type="button"
            className={`ps-btn ps-btn--hero${slug === activeSlug ? " ps-btn--primary" : ""}`}
            aria-pressed={slug === activeSlug}
            onClick={() => handleSlugChange(slug)}
          >
            {PASS_LABEL_BY_SLUG[slug]}
            {!layoutsEqual(savedLayouts[slug], draftLayouts[slug]) ? " •" : ""}
          </button>
        ))}
      </div>

      <div className="pzw-prod__actions">
        <button type="button" className="ps-btn ps-btn--primary ps-btn--hero" disabled={!isDirty || saving} onClick={() => void handleSave()}>
          {saving ? "Saving…" : `Save ${activeLabel} Layout`}
        </button>
        <button type="button" className="ps-btn ps-btn--hero" disabled={!isDirty} onClick={handleRevert}>
          Revert Changes
        </button>
        <button
          type="button"
          className="ps-btn ps-btn--hero"
          disabled={activePresetId === "custom"}
          onClick={handleResetToPreset}
        >
          Reset to Preset
        </button>
      </div>

      <div className="pzw-prod__body">
        <div
          className="pzw-prod__preview-wrap"
          ref={frameRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="pzw-prod__preview-card" style={{ aspectRatio: BOBOS_PASS_ASPECT_RATIO }}>
            {previewLoading && !previewUrl ? (
              <div className="pzw-prod__preview-empty">Compositing preview…</div>
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Production layout preview" className="pzw-prod__preview-image" />
            ) : previewError ? (
              <div className="pzw-prod__preview-empty">{previewError}</div>
            ) : (
              <div className="pzw-prod__preview-empty">Generate {activeLabel} artwork to preview layout</div>
            )}

            {previewUrl && editing ? (
              <>
                {draftLayout.safeArea.enabled ? (
                  <span className="pzw-prod__safe-area" style={{ inset: `${safeInset}%` }} />
                ) : null}
                <LayoutZoneOverlay
                  label="QR"
                  rect={qrSquareRect(draftLayout.qr)}
                  tone="qr"
                  editing={editing}
                  onMoveStart={(event) => startMove("qr", event)}
                  onResizeStart={(event) => startResize("qr", event)}
                />
                <LayoutZoneOverlay
                  label="Serial"
                  rect={draftLayout.serial}
                  tone="serial"
                  editing={editing}
                  onMoveStart={(event) => startMove("serial", event)}
                  onResizeStart={(event) => startResize("serial", event)}
                />
              </>
            ) : null}
          </div>
        </div>

        <div className="pzw-prod__controls">
          <div className="pzw-prod__group">
            <h3 className="pzw-prod__group-title">QR</h3>
            <div className="pzw-prod__grid">
              <label className="pzw-prod__field">
                <span>X</span>
                <input type="range" min={0} max={100} value={Math.round(draftLayout.qr.x * 100)} onChange={(e) => updateQr("x", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.qr.x * 100)}</em>
              </label>
              <label className="pzw-prod__field">
                <span>Y</span>
                <input type="range" min={0} max={100} value={Math.round(draftLayout.qr.y * 100)} onChange={(e) => updateQr("y", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.qr.y * 100)}</em>
              </label>
              <label className="pzw-prod__field">
                <span>Size</span>
                <input type="range" min={5} max={95} value={Math.round(draftLayout.qr.size * 100)} onChange={(e) => updateQr("size", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.qr.size * 100)}</em>
              </label>
              <label className="pzw-prod__field">
                <span>Padding</span>
                <input type="range" min={0} max={20} value={Math.round(draftLayout.qr.padding * 100)} onChange={(e) => updateQr("padding", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.qr.padding * 100)}</em>
              </label>
              <label className="pzw-prod__field">
                <span>White BG</span>
                <input type="range" min={0} max={100} value={Math.round(draftLayout.qr.whiteBackgroundOpacity * 100)} onChange={(e) => updateQr("whiteBackgroundOpacity", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.qr.whiteBackgroundOpacity * 100)}</em>
              </label>
            </div>
          </div>

          <div className="pzw-prod__group">
            <h3 className="pzw-prod__group-title">Serial</h3>
            <div className="pzw-prod__grid">
              <label className="pzw-prod__field">
                <span>X</span>
                <input type="range" min={0} max={100} value={Math.round(draftLayout.serial.x * 100)} onChange={(e) => updateSerial("x", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.serial.x * 100)}</em>
              </label>
              <label className="pzw-prod__field">
                <span>Y</span>
                <input type="range" min={0} max={100} value={Math.round(draftLayout.serial.y * 100)} onChange={(e) => updateSerial("y", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.serial.y * 100)}</em>
              </label>
              <label className="pzw-prod__field">
                <span>Width</span>
                <input type="range" min={5} max={95} value={Math.round(draftLayout.serial.width * 100)} onChange={(e) => updateSerial("width", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.serial.width * 100)}</em>
              </label>
              <label className="pzw-prod__field">
                <span>Height</span>
                <input type="range" min={3} max={40} value={Math.round(draftLayout.serial.height * 100)} onChange={(e) => updateSerial("height", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.serial.height * 100)}</em>
              </label>
              <label className="pzw-prod__field">
                <span>Font size</span>
                <input type="range" min={12} max={48} value={draftLayout.serial.fontSize} onChange={(e) => updateSerial("fontSize", Number(e.target.value))} />
                <em>{draftLayout.serial.fontSize}px</em>
              </label>
              <label className="pzw-prod__field">
                <span>Rotation</span>
                <input type="range" min={-15} max={15} step={0.5} value={draftLayout.serial.rotation} onChange={(e) => updateSerial("rotation", Number(e.target.value))} />
                <em>{draftLayout.serial.rotation.toFixed(1)}°</em>
              </label>
              <label className="pzw-prod__field">
                <span>Ink opacity</span>
                <input type="range" min={40} max={100} value={Math.round(draftLayout.serial.inkOpacity * 100)} onChange={(e) => updateSerial("inkOpacity", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.serial.inkOpacity * 100)}</em>
              </label>
            </div>
          </div>

          <div className="pzw-prod__group">
            <h3 className="pzw-prod__group-title">Safe Area</h3>
            <div className="pzw-prod__safe-controls">
              <label className="pzw-prod__toggle">
                <input type="checkbox" checked={draftLayout.safeArea.enabled} onChange={(e) => updateSafeArea("enabled", e.target.checked)} />
                <span>Show safe margin guide</span>
              </label>
              <label className="pzw-prod__field">
                <span>Margin</span>
                <input type="range" min={0} max={15} value={Math.round(draftLayout.safeArea.margin * 100)} disabled={!draftLayout.safeArea.enabled} onChange={(e) => updateSafeArea("margin", Number(e.target.value) / 100)} />
                <em>{pct(draftLayout.safeArea.margin * 100)}</em>
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
