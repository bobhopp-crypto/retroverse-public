import { describe, expect, it } from "vitest";

import {
  factoryViewModelFor,
  isProductionEligible,
  operatorStatusFor,
  type FactoryBrowserRow,
} from "./home-page-factory-model";
import type { IssueGenerationMonitorJob } from "./issue-generation-monitor";

function row(partial: Partial<FactoryBrowserRow> = {}): FactoryBrowserRow {
  return {
    id: "1",
    artist: "Bob Seger",
    title: "Night Moves",
    album: "Night Moves",
    year: 1976,
    playCount: 87,
    rvtr: "RVTR347287",
    thumbnailUrl: null,
    lengthSeconds: 240,
    fileExists: true,
    isVideo: true,
    canonicalPreflight: {
      eligible: true,
      publicReady: true,
      status: "ready",
      reasonCode: "other",
      reasonLabel: "Eligible",
      warnings: [],
      canonical: {
        songResolved: true,
        songHref: "/track/RVTR347287",
        albumResolved: true,
        artistResolved: true,
        yearResolved: true,
      },
    },
    ...partial,
  };
}

describe("home-page-factory-model Phase 1", () => {
  it("treats play count 1 as production eligible", () => {
    expect(
      isProductionEligible(
        row({
          playCount: 1,
          canonicalPreflight: {
            eligible: true,
            publicReady: false,
            status: "ready",
            reasonCode: "other",
            reasonLabel: "Eligible",
            warnings: ["Song route unavailable"],
            canonical: {
              songResolved: false,
              albumResolved: false,
              artistResolved: false,
              yearResolved: false,
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it("marks missing RVTR as needs attention", () => {
    const status = operatorStatusFor(
      row({
        rvtr: null,
        canonicalPreflight: {
          eligible: false,
          publicReady: false,
          status: "needs-attention",
          reasonCode: "missing-rvtr",
          reasonLabel: "Missing RVTR",
          warnings: [],
          canonical: {
            songResolved: false,
            albumResolved: false,
            artistResolved: false,
            yearResolved: false,
          },
        },
      }),
      null,
    );
    expect(status.status).toBe("NEEDS ATTENTION");
  });

  it("maps rejected generated artwork to REVIEW with regenerate action", () => {
    const job: IssueGenerationMonitorJob = {
      rvtr: "RVTR347287",
      title: "Night Moves",
      artist: "Bob Seger",
      year: 1976,
      playCount: 87,
      status: "succeeded",
      origin: "checkpoint",
      frameSelection: {
        candidateCount: 12,
        selectedTimestamps: [1, 2, 3, 4],
        selectedReasons: [],
        rejected: {},
        contactSheetAvailable: true,
      },
      generatedOutput: {
        available: true,
        operatorPreviewHref: "/api/ops/issue-generation/generated-output?rvtr=RVTR347287",
        generatedAt: "2026-08-01T00:00:00.000Z",
        reviewState: "rejected",
        reviewReason: "Generated text is malformed",
      },
      updatedAt: "2026-08-01T00:00:00.000Z",
    };
    const view = factoryViewModelFor(row(), job);
    expect(view.status).toBe("REVIEW");
    expect(view.primaryAction).toBe("REGENERATE ARTWORK");
    expect(view.actionEnabled).toBe(false);
    expect(view.frameEvidence.contactSheetHref).toContain("RVTR347287");
    expect(view.artwork.previewHref).toContain("generated-output");
  });
});
