"use client";

import { overlayColorsForPassType } from "@/lib/ops/event-studio/pass-studio/placeholder-artwork";
import type { GeneratedPass, PassTemplate } from "@/lib/ops/event-studio/pass-studio/types";

type Props = {
  pass: GeneratedPass;
  template: PassTemplate | undefined;
  side: "front" | "back";
};

const COMPOSITED_RENDER_PREFIX = "/api/bobos/pass-workspace/files/";

function isCompositedRender(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith(COMPOSITED_RENDER_PREFIX));
}

function passRegistrationUrl(pass: GeneratedPass): string {
  return pass.qr.url || `https://retroverse.live/pass/${pass.serial}`;
}

export function PassFace({ pass, template, side }: Props) {
  const artworkUrl = side === "front" ? pass.front.artworkUrl : pass.back.artworkUrl;
  const composited = isCompositedRender(artworkUrl);
  const showQr = !composited && template?.qrPosition.side === side;
  const hasArtwork = Boolean(artworkUrl);
  const primary = template?.colors.primary ?? "#1a0f2e";
  const secondary = template?.colors.secondary ?? "#ffffff";
  const accent = template?.colors.accent ?? "#c494ff";
  const registrationUrl = passRegistrationUrl(pass);
  const overlayColors = overlayColorsForPassType(pass.passType);

  return (
    <article
      className={`ps-face${hasArtwork ? " ps-face--artwork" : ""}${composited ? " ps-face--composited" : ""}`}
      style={{
        background: hasArtwork ? undefined : primary,
        color: secondary,
        fontFamily: template?.fonts.body,
      }}
    >
      {artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artworkUrl} alt="" className="ps-face__artwork" />
      ) : null}

      {!composited && hasArtwork ? (
        <>
          {side === "back" ? (
            <p className="ps-face__pass-url" style={{ color: overlayColors.ink }} aria-label="Registration URL">
              {registrationUrl}
            </p>
          ) : null}
          <p className="ps-face__serial-band" style={{ color: overlayColors.bandInk }} aria-label="Pass serial">
            No. {pass.serial}
          </p>
        </>
      ) : !hasArtwork ? (
        <div className="ps-face__overlay">
          {template?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={template.logoUrl} alt="" className="ps-face__logo" />
          ) : null}

          <p className="ps-face__pass-type" style={{ color: accent, fontFamily: template?.fonts.heading }}>
            {pass.passType}
          </p>
          <h2 className="ps-face__event" style={{ fontFamily: template?.fonts.heading }}>
            {pass.eventName}
          </h2>
          <p className="ps-face__venue">{pass.venue}</p>
          <p className="ps-face__date">{pass.date}</p>

          <p className="ps-face__serial">No. {pass.serial}</p>
        </div>
      ) : null}

      {showQr && pass.qr.svg ? (
        <div
          className="ps-face__qr"
          style={{
            left: `${template!.qrPosition.xPct}%`,
            top: `${template!.qrPosition.yPct}%`,
            width: `${template!.qrPosition.sizePct}%`,
            height: `${template!.qrPosition.sizePct}%`,
          }}
          dangerouslySetInnerHTML={{ __html: pass.qr.svg }}
        />
      ) : null}
    </article>
  );
}
