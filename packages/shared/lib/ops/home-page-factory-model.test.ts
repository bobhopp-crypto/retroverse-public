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
    artist: "Talking Heads",
    title: "Once in a Lifetime",
    album: "Remain in Light",
    year: 1980,
    playCount: 87,
    rvtr: "RVTR478078",
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
        songHref: "/track/RVTR478078",
        albumResolved: true,
        artistResolved: true,
        yearResolved: true,
      },
    },
    ...partial,
  };
}

function selectedHeroJob(reviewState: IssueGenerationMonitorJob["reviewState"] = "pending-review"): IssueGenerationMonitorJob {
  return {
    rvtr: "RVTR478078",
    title: "Once in a Lifetime",
    artist: "Talking Heads",
    year: 1980,
    playCount: 87,
    status: "succeeded",
    origin: "checkpoint",
    reviewState,
    magazineHeroFrame: {
      available: true,
      operatorPreviewHref: "/api/ops/issue-generation/hero-frame?rvtr=RVTR478078",
      path: "/tmp/selected-01.jpg",
      timestamp: 18.4,
      sha256: "abc123",
      reason: "Strong landscape performer frame.",
      selectedAt: "2026-08-04T00:00:00.000Z",
    },
    updatedAt: "2026-08-04T00:00:00.000Z",
  };
}

describe("home-page-factory-model V1", () => {
  it("treats play count 1 as production eligible", () => {
    expect(isProductionEligible(row({ playCount: 1 }))).toBe(true);
  });

  it("marks missing RVTR as needs attention", () => {
    expect(
      operatorStatusFor(
        row({
          rvtr: null,
          canonicalPreflight: {
            ...row().canonicalPreflight!,
            eligible: false,
            reasonLabel: "Missing RVTR",
          },
        }),
        null,
      ).status,
    ).toBe("NEEDS ATTENTION");
  });

  it("uses a selected real frame for review and record-only approval", () => {
    const view = factoryViewModelFor(row(), selectedHeroJob());
    expect(view.status).toBe("REVIEW");
    expect(view.statusReason).toBe("Selected frame ready · awaiting approval");
    expect(view.primaryAction).toBe("APPROVE HOMEPAGE");
    expect(view.secondaryAction).toBe("CHOOSE DIFFERENT FRAME");
    expect(view.homepage.previewHref).toBe("/bobos/browser-plus/preview/RVTR478078?mode=magazine");
  });

  it("uses approval state only after a selected frame exists", () => {
    const view = factoryViewModelFor(row(), selectedHeroJob("approved"));
    expect(view.status).toBe("COMPLETE");
    expect(view.primaryAction).toBe("OPEN HOMEPAGE");
    expect(view.secondaryAction).toBe("CHOOSE DIFFERENT FRAME");
  });

  it("does not let generated artwork determine V1 status", () => {
    const job: IssueGenerationMonitorJob = {
      ...selectedHeroJob(),
      magazineHeroFrame: undefined,
      generatedOutput: {
        available: true,
        operatorPreviewHref: "/api/ops/issue-generation/generated-output?rvtr=RVTR478078",
        generatedAt: "2026-08-04T00:00:00.000Z",
        reviewState: "approved",
      },
    };
    const view = factoryViewModelFor(row(), job);
    expect(view.status).toBe("READY");
    expect(view.primaryAction).toBe("CHOOSE DIFFERENT FRAME");
    expect(view.homepage.available).toBe(false);
  });
});
