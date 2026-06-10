"use client";

import type { ArtBoardSpec } from "@/lib/ops/creative-lab/art-board-spec";
import { applyPalette, paletteForDirection } from "@/lib/ops/creative-lab/illustration/colors";
import { composeBoard } from "@/lib/ops/creative-lab/illustration/compose";
import type { IllustrationAsset, PlacedAsset } from "@/lib/ops/creative-lab/illustration/types";

type Props = {
  spec: ArtBoardSpec;
};

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function SvgContent({ asset, palette }: { asset: IllustrationAsset; palette: ReturnType<typeof paletteForDirection> }) {
  return <g dangerouslySetInnerHTML={{ __html: applyPalette(asset.content, palette) }} />;
}

function PlacedSprite({
  placed,
  palette,
}: {
  placed: PlacedAsset;
  palette: ReturnType<typeof paletteForDirection>;
}) {
  const { asset, x, y, width, height, rotation = 0, opacity = 1, flipX } = placed;
  const cx = width / 2;
  const cy = height / 2;
  const parts = [`translate(${x},${y})`];
  if (flipX) parts.push(`translate(${width},0) scale(-1,1)`);
  if (rotation) parts.push(`rotate(${rotation},${cx},${cy})`);
  return (
    <g transform={parts.join(" ")} opacity={opacity}>
      <svg width={width} height={height} viewBox={asset.viewBox} overflow="visible">
        <SvgContent asset={asset} palette={palette} />
      </svg>
    </g>
  );
}

export function ComposedArtBoard({ spec }: Props) {
  const composition = composeBoard(spec);
  const palette = paletteForDirection(spec.artDirectionId);
  const label = spec.artDirectionId.replace(/-/g, " ");

  return (
    <svg
      viewBox={`0 0 ${composition.width} ${composition.height}`}
      className="cl-art-board__svg cl-composed-board"
      role="img"
      aria-label={`${label} composed artwork`}
    >
      {composition.defs ? (
        <defs dangerouslySetInnerHTML={{ __html: applyPalette(composition.defs, palette) }} />
      ) : null}
      <g className="cl-composed-board__background">
        {composition.background.map((a) => (
          <SvgContent key={a.id} asset={a} palette={palette} />
        ))}
      </g>
      <ellipse cx={200} cy={220} rx={160} ry={140} fill="url(#boardGlow)" opacity={0.45} />
      <g className="cl-composed-board__decorations">
        {composition.decorations.map((p, i) => (
          <PlacedSprite key={`deco-${p.asset.id}-${i}`} placed={p} palette={palette} />
        ))}
      </g>
      <g className="cl-composed-board__centerpiece">
        {composition.centerpiece.map((p, i) => (
          <PlacedSprite key={`center-${p.asset.id}-${i}`} placed={p} palette={palette} />
        ))}
      </g>
      <g className="cl-composed-board__accents">
        {composition.accents.map((p, i) => (
          <PlacedSprite key={`accent-${p.asset.id}-${i}`} placed={p} palette={palette} />
        ))}
      </g>
      <g className="cl-composed-board__numbering">
        {composition.numbering.map((p, i) => (
          <PlacedSprite key={`num-${p.asset.id}-${i}`} placed={p} palette={palette} />
        ))}
      </g>
      <g className="cl-composed-board__frame">
        {composition.frame.map((p, i) => (
          <PlacedSprite key={`frame-${p.asset.id}-${i}`} placed={p} palette={palette} />
        ))}
      </g>
      <g className="cl-art-board__event">
        <rect x={20} y={492} width={360} height={48} fill="rgba(0,0,0,0.62)" rx={3} />
        <text x={200} y={512} fill="#fff" fontSize={10} fontWeight={700} textAnchor="middle" opacity={0.92}>
          {truncate(spec.event, 28)}
        </text>
        <text x={200} y={528} fill="#fff" fontSize={8} textAnchor="middle" opacity={0.72}>
          {truncate(spec.venue, 22)}{spec.date ? ` · ${truncate(spec.date, 16)}` : ""}
        </text>
      </g>
      <text
        x={200}
        y={250}
        fill={palette.c4}
        fontSize={spec.treatment?.illustrationDensity === "heavy" ? 22 : 18}
        fontWeight={900}
        textAnchor="middle"
        opacity={0.92}
        style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
      >
        {truncate(spec.event, 14)}
      </text>
      <text x={200} y={478} fill={palette.c4} fontSize={11} fontWeight={800} textAnchor="middle" letterSpacing={2}>
        {spec.passNumber}
      </text>
    </svg>
  );
}
