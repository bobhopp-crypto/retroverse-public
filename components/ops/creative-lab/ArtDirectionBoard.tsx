"use client";

import type { ArtBoardSpec } from "@/lib/ops/creative-lab/art-board-spec";

import { ComposedArtBoard } from "./ComposedArtBoard";

type Props = {
  spec: ArtBoardSpec;
  compact?: boolean;
};

/** Renders art-direction concept boards via the illustration composition engine. */
export function ArtDirectionBoard(props: Props) {
  return <ComposedArtBoard spec={props.spec} />;
}
