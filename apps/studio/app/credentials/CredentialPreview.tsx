import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";

import {
  DEFAULT_FINISHING,
  credentialTypeLabel,
  formatCredentialDate,
  type ArtworkAsset,
  type AuthenticationLayout,
  type CredentialDraft,
  type CredentialFaceId,
  type CredentialTypeId,
  type FinishingAdjustments,
} from "./model";

export type { AuthenticationLayout } from "./model";

type AuthObject = "qr" | "serial";
type ResizeCorner = "nw" | "ne" | "sw" | "se";

type Props = {
  draft: Pick<CredentialDraft, "eventName" | "venue" | "date" | "optionalText" | "serials">;
  credentialType: CredentialTypeId;
  face: CredentialFaceId;
  artwork: ArtworkAsset | null;
  adjustments: FinishingAdjustments;
  before?: boolean;
  className?: string;
  authLayout?: AuthenticationLayout;
  onAuthChange?: (layout: AuthenticationLayout) => void;
};

function artworkStyle(adjustments: FinishingAdjustments): CSSProperties {
  const scale = Math.max(100, adjustments.scale) / 100;
  const maxTranslation = ((scale - 1) / (2 * scale)) * 100;
  const x = (adjustments.x / 100) * maxTranslation;
  const y = (adjustments.y / 100) * maxTranslation;
  const exposure = 2 ** adjustments.exposure;
  const brightness = Math.max(0.15, exposure * (1 + adjustments.brightness / 180));
  const contrast = Math.max(0, 1 + adjustments.contrast / 100 + adjustments.sharpen / 500);
  const saturation = Math.max(0, (1 + adjustments.saturation / 100) * (1 + adjustments.vibrance / 180));
  return {
    filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${adjustments.hue}deg)`,
    transform: `scale(${scale}) translate(${x}%, ${y}%)`,
  };
}

function overlayStyle(adjustments: FinishingAdjustments): CSSProperties {
  const temperature = adjustments.temperature;
  const tint = adjustments.tint;
  const temperatureColor = temperature >= 0 ? "255, 151, 61" : "70, 139, 255";
  const tintColor = tint >= 0 ? "221, 76, 178" : "52, 184, 112";
  return {
    "--credential-temperature": `rgba(${temperatureColor}, ${Math.abs(temperature) / 360})`,
    "--credential-tint": `rgba(${tintColor}, ${Math.abs(tint) / 420})`,
    "--credential-grain": `${adjustments.grain / 135}`,
    "--credential-fade": `${adjustments.fade / 140}`,
  } as CSSProperties;
}

export function CredentialPreview({
  draft,
  credentialType,
  face,
  artwork,
  adjustments,
  before = false,
  className = "",
  authLayout,
  onAuthChange,
}: Props) {
  const productionRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<null | {
    kind: AuthObject;
    mode: "move" | "resize";
    corner?: ResizeCorner;
    pointerId: number;
    startX: number;
    startY: number;
    layout: AuthenticationLayout;
  }>(null);
  const [selectedAuth, setSelectedAuth] = useState<AuthObject | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState({ vertical: false, horizontal: false });
  const activeAdjustments = before ? DEFAULT_FINISHING : adjustments;
  const typeLabel = credentialTypeLabel(credentialType);
  const completeFace = artwork?.renderMode === "complete";
  const previewSerial = credentialType === "event"
    ? "RVSN990001"
    : credentialType === "vip"
      ? "RVSN990002"
      : "RVSN990003";
  const serial = draft.serials[credentialType] ?? previewSerial;
  const serialIsPreview = !draft.serials[credentialType];
  const accessibleLabel = `${draft.eventName || "Untitled credential"}, ${typeLabel}, ${face} preview`;

  function layoutWithGuides(next: AuthenticationLayout, kind: AuthObject): AuthenticationLayout {
    // The credential itself is the canvas. Safe and reserved areas are visual
    // production guides only; they must never clamp an editing object.
    if (kind === "qr") {
      const qrX = Math.abs(next.qrX - 50) <= 1.6 ? 50 : next.qrX;
      const qrY = Math.abs(next.qrY - 52) <= 1.6 ? 52 : next.qrY;
      setAlignmentGuides({ vertical: qrX === 50, horizontal: qrY === 52 });
      return { ...next, qrX, qrY };
    }
    const serialX = Math.abs(next.serialX - 50) <= 1.6 ? 50 : next.serialX;
    setAlignmentGuides({ vertical: serialX === 50, horizontal: false });
    return { ...next, serialX };
  }

  function beginAuthInteraction(
    kind: AuthObject,
    mode: "move" | "resize",
    event: ReactPointerEvent<HTMLElement>,
    corner?: ResizeCorner,
  ) {
    if (!authLayout || !onAuthChange) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedAuth(kind);
    interactionRef.current = {
      kind,
      mode,
      corner,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      layout: authLayout,
    };
  }

  function moveAuthInteraction(event: ReactPointerEvent<HTMLDivElement>) {
    const interaction = interactionRef.current;
    const bounds = productionRef.current?.getBoundingClientRect();
    if (!interaction || interaction.pointerId !== event.pointerId || !bounds || !onAuthChange) return;
    event.stopPropagation();
    const dx = ((event.clientX - interaction.startX) / bounds.width) * 100;
    const dy = ((event.clientY - interaction.startY) / bounds.height) * 100;
    const dyAsWidth = ((event.clientY - interaction.startY) / bounds.width) * 100;
    let next = { ...interaction.layout };
    if (interaction.kind === "qr") {
      if (interaction.mode === "resize") {
        const xDirection = interaction.corner?.includes("w") ? -1 : 1;
        const yDirection = interaction.corner?.includes("n") ? -1 : 1;
        const delta = (dx * xDirection + dyAsWidth * yDirection) / 2;
        next.qrSize = Math.min(44, Math.max(18, interaction.layout.qrSize + delta));
        const halfDeltaX = (next.qrSize - interaction.layout.qrSize) / 2;
        const halfDeltaY = ((next.qrSize - interaction.layout.qrSize) * 9) / 28;
        next.qrX = interaction.layout.qrX + halfDeltaX * xDirection;
        next.qrY = interaction.layout.qrY + halfDeltaY * yDirection;
      }
      else { next.qrX += dx; next.qrY += dy; }
    } else if (interaction.mode === "resize") {
      next.serialScale = Math.min(140, Math.max(70, interaction.layout.serialScale + dx * 2));
    } else { next.serialX += dx; next.serialY += dy; }
    onAuthChange(layoutWithGuides(next, interaction.kind));
  }

  function endAuthInteraction(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interactionRef.current || interactionRef.current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    interactionRef.current = null;
    setAlignmentGuides({ vertical: false, horizontal: false });
  }

  function nudgeAuth(kind: AuthObject, event: ReactKeyboardEvent<HTMLElement>) {
    if (!authLayout || !onAuthChange || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 5 : 1;
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    const next = kind === "qr" ? { ...authLayout, qrX: authLayout.qrX + dx, qrY: authLayout.qrY + dy } : { ...authLayout, serialX: authLayout.serialX + dx, serialY: authLayout.serialY + dy };
    onAuthChange(layoutWithGuides(next, kind));
  }

  return (
    <div
      className={`credential-canvas credential-canvas--${face}${completeFace ? " credential-canvas--complete" : ""}${className ? ` ${className}` : ""}`}
      role={onAuthChange ? "group" : "img"}
      aria-label={accessibleLabel}
      style={{ ...overlayStyle(activeAdjustments), ...(authLayout ? { "--credential-qr-size": `${authLayout.qrSize}%`, "--credential-qr-x": `${authLayout.qrX}%`, "--credential-qr-y": `${authLayout.qrY}%`, "--credential-serial-x": `${authLayout.serialX}%`, "--credential-serial-y": `${authLayout.serialY}%`, "--credential-serial-scale": `${authLayout.serialScale / 100}` } : {}) } as CSSProperties}
    >
      <div className="credential-canvas__artwork" style={artworkStyle(activeAdjustments)}>
        {artwork ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artwork.source} alt="" draggable={false} />
        ) : (
          <div className="credential-canvas__empty" aria-hidden="true" />
        )}
      </div>
      <div className="credential-canvas__color" aria-hidden="true" />
      <div className="credential-canvas__grain" aria-hidden="true" />
      <div className="credential-canvas__fade" aria-hidden="true" />
      <div className="credential-canvas__legibility" aria-hidden="true" />

      {!completeFace && face === "front" ? (
        <div className="credential-composition credential-composition--front">
          <p className="credential-composition__event">{draft.eventName || "Event Name"}</p>
          <div className="credential-composition__identity">
            <p className="credential-composition__type">{typeLabel}</p>
          </div>
          <div className="credential-composition__footer">
            <p>{draft.venue || "Venue"}</p>
            <p>{formatCredentialDate(draft.date)}</p>
          </div>
        </div>
      ) : !completeFace ? (
        <div className="credential-composition credential-composition--back">
          <p className="credential-composition__event">{draft.eventName || "Event Name"}</p>
          {draft.optionalText ? (
            <p className="credential-composition__optional">{draft.optionalText}</p>
          ) : (
            <span aria-hidden="true" />
          )}
          <div className="credential-composition__footer">
            <p>{draft.venue || "Venue"}</p>
            <p>{formatCredentialDate(draft.date)}</p>
          </div>
        </div>
      ) : null}

      {face === "back" ? (
        <div ref={productionRef} className={`credential-production${onAuthChange ? " credential-production--editable" : ""}`} aria-label={`${serialIsPreview ? "Preview" : "Production"} serial ${serial}`} onPointerMove={moveAuthInteraction} onPointerUp={endAuthInteraction} onPointerCancel={endAuthInteraction} onLostPointerCapture={endAuthInteraction} onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedAuth(null); }}>
          {authLayout?.safe ? <div className="credential-production__safe" aria-hidden="true" /> : null}
          {authLayout?.reserved ? <div className="credential-production__reserved" aria-hidden="true" /> : null}
          {alignmentGuides.vertical ? <span className="credential-alignment-guide credential-alignment-guide--vertical" aria-hidden="true" /> : null}
          {alignmentGuides.horizontal ? <span className="credential-alignment-guide credential-alignment-guide--horizontal" aria-hidden="true" /> : null}
          <span className="credential-production__type">{typeLabel}</span>
          <div data-auth-object="qr" tabIndex={onAuthChange ? 0 : undefined} role={onAuthChange ? "button" : undefined} aria-label={onAuthChange ? "QR code. Drag to move, use the corner handles to resize, or use arrow keys to nudge." : undefined} className={`credential-production__qr${selectedAuth === "qr" ? " credential-production__object--selected" : ""}`} onPointerDown={(event) => beginAuthInteraction("qr", "move", event)} onKeyDown={(event) => nudgeAuth("qr", event)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/bobos/credentials/qr/${encodeURIComponent(serial)}`} alt="" draggable={false} />
            {onAuthChange ? <><span className="credential-resize-handle credential-resize-handle--nw" aria-hidden="true" onPointerDown={(event) => beginAuthInteraction("qr", "resize", event, "nw")} /><span className="credential-resize-handle credential-resize-handle--ne" aria-hidden="true" onPointerDown={(event) => beginAuthInteraction("qr", "resize", event, "ne")} /><span className="credential-resize-handle credential-resize-handle--sw" aria-hidden="true" onPointerDown={(event) => beginAuthInteraction("qr", "resize", event, "sw")} /><span className="credential-resize-handle credential-resize-handle--se" aria-hidden="true" onPointerDown={(event) => beginAuthInteraction("qr", "resize", event, "se")} /></> : null}
          </div>
          <div data-auth-object="serial" tabIndex={onAuthChange ? 0 : undefined} role={onAuthChange ? "button" : undefined} aria-label={onAuthChange ? "Serial number. Drag to move, use the corner handle to resize, or use arrow keys to nudge." : undefined} className={`credential-production__serial${selectedAuth === "serial" ? " credential-production__object--selected" : ""}`} onPointerDown={(event) => beginAuthInteraction("serial", "move", event)} onKeyDown={(event) => nudgeAuth("serial", event)}>
            {serialIsPreview ? <span>Preview</span> : <span>Retroverse</span>}
            <strong>{serial}</strong>
            {onAuthChange ? <span className="credential-resize-handle credential-resize-handle--se" aria-hidden="true" onPointerDown={(event) => beginAuthInteraction("serial", "resize", event, "se")} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
