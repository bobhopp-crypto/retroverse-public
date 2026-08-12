"use client";

import { MediaLabCutterWorkspace } from "./MediaLabCutterWorkspace";

type Props = {
  defaultYear?: number;
};

/**
 * Canonical Media Lab primary render path.
 *
 * Legacy library, setup, chapter, refinement, editorial review, harvest, approval,
 * and export components remain in the repository for compatibility, but the Cutter
 * workspace is the sole default interface at /bobos/media-lab.
 */
export function MediaLabWorkspace(_props: Props) {
  return <MediaLabCutterWorkspace />;
}
