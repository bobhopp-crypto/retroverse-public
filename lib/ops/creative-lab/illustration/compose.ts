import type { ArtBoardSpec } from "../art-board-spec";
import { assetsByLayer } from "./catalog";
import type { BoardComposition, IllustrationAsset, PlacedAsset } from "./types";
import { compositionSeed, densityCount, pickAsset, pickMany } from "./seed";

const BOARD_W = 400;
const BOARD_H = 560;

function place(
  asset: IllustrationAsset,
  x: number,
  y: number,
  width: number,
  height: number,
  opts?: Partial<Pick<PlacedAsset, "rotation" | "opacity" | "flipX">>,
): PlacedAsset {
  return { asset, x, y, width, height, ...opts };
}

function composePsychedelic(spec: ArtBoardSpec, seed: number): BoardComposition {
  const id = spec.artDirectionId;
  const bg = [pickAsset(assetsByLayer(id, "background"), seed, 0)];
  const frameAsset = pickAsset(assetsByLayer(id, "frame"), seed, 1);
  const decoPool = assetsByLayer(id, "decoration");
  const accentPool = assetsByLayer(id, "accent");
  const decoCount = densityCount(spec, 4, 7, 10);

  const decorations: PlacedAsset[] = [
    place(pickAsset(decoPool, seed, 2), 0, 0, 88, 110, { rotation: 0 }),
    place(pickAsset(decoPool, seed, 3), 312, 0, 88, 110, { flipX: true }),
    place(pickAsset(decoPool, seed, 4), 0, 400, 88, 110, { rotation: 180 }),
    place(pickAsset(decoPool, seed, 5), 312, 400, 88, 110, { rotation: 180, flipX: true }),
    place(pickAsset(decoPool, seed, 6), 0, 200, 200, 48),
    place(pickAsset(decoPool, seed, 7), 200, 430, 200, 48, { rotation: 180 }),
    ...pickMany(decoPool, seed, decoCount - 6, 5).map((a, i) =>
      place(a, 60 + (i % 4) * 80, 120 + Math.floor(i / 4) * 70, 64, 80, { opacity: 0.85 }),
    ),
  ];

  const centerpiece = [
    place(pickAsset(assetsByLayer(id, "centerpiece"), seed, 8), 100, 130, 200, 200),
    place(pickAsset(assetsByLayer(id, "centerpiece"), seed, 9), 150, 175, 100, 100, { opacity: 0.95 }),
  ];

  const accents = pickMany(accentPool, seed, densityCount(spec, 3, 6, 9), 7).map((a, i) =>
    place(a, 40 + (i * 37) % 320, 80 + (i * 43) % 360, 48, 48, { rotation: (i * 24) % 360, opacity: 0.9 }),
  );

  const numAsset = pickAsset(assetsByLayer(id, "numbering").length ? assetsByLayer(id, "numbering") : decoPool, seed, 11);
  const numbering = [place(numAsset, 100, 440, 200, 48)];

  return {
    artDirectionId: id,
    width: BOARD_W,
    height: BOARD_H,
    background: bg,
    frame: [place(frameAsset, 0, 0, BOARD_W, BOARD_H)],
    decorations,
    centerpiece,
    accents,
    numbering,
    defs: `<radialGradient id="boardGlow" cx="50%" cy="40%" r="50%"><stop offset="0%" stop-color="{{c2}}" stop-opacity="0.35"/><stop offset="100%" stop-color="{{c5}}" stop-opacity="0"/></radialGradient>`,
  };
}

function composeCartoon(spec: ArtBoardSpec, seed: number): BoardComposition {
  const id = spec.artDirectionId;
  const decoPool = assetsByLayer(id, "decoration");
  const centerPool = assetsByLayer(id, "centerpiece");
  const accentPool = assetsByLayer(id, "accent");

  return {
    artDirectionId: id,
    width: BOARD_W,
    height: BOARD_H,
    background: [pickAsset(assetsByLayer(id, "background"), seed, 0)],
    frame: [place(pickAsset(assetsByLayer(id, "frame"), seed, 1), 0, 0, BOARD_W, BOARD_H)],
    decorations: [
      place(pickAsset(decoPool, seed, 2), 20, 20, 160, 56),
      place(pickAsset(decoPool, seed, 3), 220, 20, 96, 80),
      place(pickAsset(decoPool, seed, 4), 20, 460, 120, 80),
      place(pickAsset(decoPool, seed, 5), 260, 460, 120, 80),
      ...pickMany(decoPool, seed, densityCount(spec, 2, 4, 6), 3).map((a, i) =>
        place(a, 30 + i * 90, 360, 80, 64),
      ),
    ],
    centerpiece: [
      place(pickAsset(centerPool, seed, 6), 60, 150, 120, 60),
      place(pickAsset(centerPool, seed, 7), 140, 200, 100, 100),
      place(pickAsset(centerPool, seed, 8), 250, 170, 120, 60, { flipX: true }),
    ],
    accents: pickMany(accentPool, seed, densityCount(spec, 4, 8, 12), 4).map((a, i) =>
      place(a, 20 + (i * 31) % 340, 100 + (i * 37) % 320, 56, 72, { rotation: (i * 15) % 30 - 15 }),
    ),
    numbering: [place(pickAsset(assetsByLayer(id, "numbering").length ? assetsByLayer(id, "numbering") : accentPool, seed, 12), 130, 420, 140, 56)],
  };
}

function composeTelevision(spec: ArtBoardSpec, seed: number): BoardComposition {
  const id = spec.artDirectionId;
  const decoPool = assetsByLayer(id, "decoration");
  const accentPool = assetsByLayer(id, "accent");

  return {
    artDirectionId: id,
    width: BOARD_W,
    height: BOARD_H,
    background: [pickAsset(assetsByLayer(id, "background"), seed, 0)],
    frame: [place(pickAsset(assetsByLayer(id, "frame"), seed, 1), 0, 0, BOARD_W, BOARD_H)],
    decorations: [
      place(pickAsset(decoPool, seed, 2), 30, 30, 200, 160),
      place(pickAsset(decoPool, seed, 3), 260, 40, 80, 80),
      place(pickAsset(decoPool, seed, 4), 30, 380, 80, 80),
      place(pickAsset(decoPool, seed, 5), 290, 380, 96, 96),
    ],
    centerpiece: [place(pickAsset(assetsByLayer(id, "centerpiece"), seed, 6), 100, 120, 200, 160)],
    accents: [
      place(pickAsset(accentPool, seed, 7), 40, 50, 100, 40),
      place(pickAsset(accentPool, seed, 8), 300, 50, 64, 48),
      place(pickAsset(accentPool, seed, 9), 160, 300, 80, 64),
      ...pickMany(accentPool, seed, densityCount(spec, 2, 4, 6), 5).map((a, i) =>
        place(a, 50 + i * 55, 400 + (i % 2) * 30, 48, 48, { opacity: 0.8 }),
      ),
    ],
    numbering: [place(pickAsset(decoPool, seed, 10), 90, 455, 220, 48)],
  };
}

function composeCollector(spec: ArtBoardSpec, seed: number): BoardComposition {
  const id = spec.artDirectionId;
  const decoPool = assetsByLayer(id, "decoration");
  const numPool = assetsByLayer(id, "numbering");

  return {
    artDirectionId: id,
    width: BOARD_W,
    height: BOARD_H,
    background: [pickAsset(assetsByLayer(id, "background"), seed, 0)],
    frame: [place(pickAsset(assetsByLayer(id, "frame"), seed, 1), 0, 0, BOARD_W, BOARD_H)],
    decorations: [
      place(pickAsset(decoPool, seed, 2), 0, 0, 64, 64),
      place(pickAsset(decoPool, seed, 3), 336, 0, 64, 64, { flipX: true }),
      place(pickAsset(decoPool, seed, 4), 0, 496, 64, 64, { rotation: 180 }),
      place(pickAsset(decoPool, seed, 5), 336, 496, 64, 64, { rotation: 180, flipX: true }),
      place(pickAsset(decoPool, seed, 6), 36, 36, 72, 72),
      place(pickAsset(decoPool, seed, 7), 292, 36, 72, 72, { flipX: true }),
      place(pickAsset(decoPool, seed, 8), 30, 200, 80, 120),
      place(pickAsset(decoPool, seed, 9), 290, 200, 80, 120, { flipX: true }),
    ],
    centerpiece: [
      place(pickAsset(assetsByLayer(id, "centerpiece"), seed, 10), 140, 140, 120, 140),
      place(pickAsset(assetsByLayer(id, "centerpiece"), seed, 11), 100, 100, 200, 80),
    ],
    accents: pickMany(assetsByLayer(id, "accent"), seed, densityCount(spec, 2, 4, 6), 6).map((a, i) =>
      place(a, 80 + i * 60, 320 + (i % 2) * 40, 72, 72),
    ),
    numbering: [place(pickAsset(numPool.length ? numPool : decoPool, seed, 12), 100, 380, 200, 80)],
  };
}

export function composeBoard(spec: ArtBoardSpec): BoardComposition {
  const seed = compositionSeed(spec);
  switch (spec.artDirectionId) {
    case "saturday-morning-cartoon":
      return composeCartoon(spec, seed);
    case "vintage-television":
      return composeTelevision(spec, seed);
    case "collector-memorabilia":
      return composeCollector(spec, seed);
    default:
      return composePsychedelic(spec, seed);
  }
}
