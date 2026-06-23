# Automation Factory Dashboard Audit

Generated: 2026-06-20

## Current Architecture

Automation Factory currently renders from `app/ops/automation-factory/page.tsx` and loads its model from `lib/ops/automation-factory/load-automation-factory.ts`.

The current loader is not VIDEO-factory authoritative. It combines:

- Browser+ model from `loadBrowserPlusModel()`
- historical package backfill files
- historical batch status files
- package index
- cover recovery queue/report files
- cover integrity hold report
- legacy thumbnail export reports
- browser `localStorage` planned work

New factory authority is:

`/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/video-work-queue.json`

The current dashboard does not read that file at all.

## Current Widget Audit

### Top Navigation

- UI: Browser+ style tabs: Library, Retroverse, Work, Factory, All Database
- Component: `app/ops/automation-factory/page.tsx`
- Source: hard-coded links to `/ops/browser-plus`
- Filter/query logic: none
- Accuracy: legacy Browser+ framing
- Issue: implies Factory is a Browser+ mode. It is now queue-authoritative and should stand alone.

### Masthead Summary Counters

- UI: Running, Needs Approval, Blocked, Disabled
- Component: `app/ops/automation-factory/page.tsx`
- Data source: `model.workers`
- File path: `lib/ops/automation-factory/load-automation-factory.ts`
- Logic: reduce workers through `controlStatus(worker)`
- Accuracy: legacy
- Issue: status is synthesized from Browser+ stats, old backfill status, cover hold reports, and approval gates. It does not reflect `video-work-queue.json` or `video-factory:loop`.

### Safety Strip

- UI: Mode, Generated, disabled Future Start Worker, disabled Future Approve Batch
- Component: `app/ops/automation-factory/page.tsx`
- Data source: `model.generatedAt`; hard-coded button labels
- File path: `lib/ops/automation-factory/load-automation-factory.ts`
- Logic: generated at request time
- Accuracy: misleading
- Issue: says no workers start here and centers future approval actions. Factory now has real queue workers driven by CLI state.

### What Should Bob Do Next

- UI: What's Running, What's Blocked, top 3 recommendations
- Component: `app/ops/automation-factory/page.tsx`
- Data source: `model.workers`
- File path: `lib/ops/automation-factory/load-automation-factory.ts`
- Logic:
  - running: `workers.filter(controlStatus === "running")`
  - blocked: `workers.filter(controlStatus === "blocked")`
  - recommendations from `coverWorker`, `publishWorker`, `identityWorker`, `thumbnailWorker`
- Accuracy: legacy
- Incorrect recommendations:
  - `Review 7,516 Identity Matches`
  - `Review Active Missing Thumbnails`
  - `Resolve Cover Integrity Hold`
  - `Review Publish Hold`
- Issue: recommendations are approval/dashboard driven, not `video-work-queue.json` driven.

### Worker Cards

- UI: one card each for Package Generation, Cover Recovery, Identity Resolution, Thumbnail Generation, Deck Readiness, Publish Pipeline
- Component: `app/ops/automation-factory/page.tsx`
- Data source: `model.workers`, `model.workerObservability`
- File path: `lib/ops/automation-factory/load-automation-factory.ts`
- Accuracy: mixed legacy, not VIDEO-factory accurate

Worker source detail:

- Cover Recovery
  - Queue depth source: `cover-recovery-queue.json` plus fallback `backfill-queue.json`
  - Paths:
    - `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/cover-recovery-queue.json`
    - `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/backfill-queue.json`
    - `/Users/bobhopp/RETROVERSE_PUBLIC/reports/intelligence/cover-integrity-hold.json`
    - `/Users/bobhopp/RETROVERSE_PUBLIC/reports/intelligence/cover-recovery-report.json`
  - Logic: `coverEntries.filter(outcome !== "recovered").length || coverFirst`
  - Accuracy: partly stale. Current VIDEO cover truth is `video-work-queue.json` rows where `state.cover=false`.

- Identity Resolution
  - Queue depth source: Browser+ `libraryHealth.missingRvtr`
  - Path: VirtualDJ database through Browser+ model
  - Logic: `browserStats?.libraryHealth.missingRvtr`
  - Accuracy: stale. Current matcher priority is `video-work-queue.json` `unmatchedVideoRows` and `matchableUnmatchedVideoRows`.

- Package Generation
  - Queue depth source: `backfill-queue.json`
  - Paths:
    - `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/backfill-queue.json`
    - `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/batch-status.json`
  - Logic: `backfillEntries.filter(filter === "missing_package").length`
  - Accuracy: stale. Current package worker selects `video-work-queue.json` rows where `matched=true && state.package=false`.

- Deck Readiness
  - Queue depth source: Browser+ `retroverseHealth.missingDeck`
  - Path: VirtualDJ database through Browser+ model
  - Logic: `browserStats?.retroverseHealth.missingDeck`
  - Accuracy: stale. Current deck truth is `video-work-queue.json` plus `deck-index.json` plus DK label state.

- Thumbnail Generation
  - Queue depth source: Browser+ `libraryHealth.missingThumbnail` or old CSV category counts
  - Paths:
    - `/Users/bobhopp/Sites/retroverse-data/exports/reports/thumbnail_comparison_20260127_114136.csv`
    - `/Users/bobhopp/Sites/retroverse-data/exports/reports/thumbnail_publish.log`
  - Logic: Browser+ stats fallback to CSV `MISSING_SIDECAR`
  - Accuracy: stale. Current thumbnail truth is `video-work-queue.json` rows where `state.thumbnail=false`.

- Publish Pipeline
  - Queue depth source: `package-index.json` statuses
  - Path: `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/package-index.json`
  - Logic: statuses `approved` + `cards_ready`
  - Accuracy: not part of current VIDEO Factory scope. Should be removed from Factory dashboard.

### Activity Feed

- Component: `app/ops/automation-factory/page.tsx`
- Data source: `model.activityFeed`
- File path: `lib/ops/automation-factory/load-automation-factory.ts`
- Logic:
  - package activity from `batch-status.json`
  - cover activity from `cover-recovery-queue.json`
  - identity activity from Browser+ missing RVTR rows
  - thumbnail activity from Browser+ present thumbnail rows and thumbnail publish log
  - publish activity from `package-index.json`
- Accuracy: legacy
- Issue: does not show VIDEO factory loop cycles, current worker, current RVTR, processed today, or last completed from factory state.

### Worker Queue Views

- Component: `app/ops/automation-factory/page.tsx`
- Data source: `model.workerObservability`
- File path: `lib/ops/automation-factory/load-automation-factory.ts`
- Accuracy: legacy

Queue source detail:

- Package Queue
  - Source: Browser+ rows
  - Logic: `row.rvtr && (row.packageStatus === "Missing Package" || row.workStatus === "Missing Package")`
  - Issue: not the factory package batch source.

- Cover Queue
  - Source: Browser+ rows
  - Logic: `row.rvtr && row.coverStatus === "Missing Cover"`
  - Issue: not the factory cover batch source.

- Identity Queue
  - Source: Browser+ rows
  - Logic: `!row.rvtr`
  - Issue: produces approval framing, not matchable queue state.

- Thumbnail Queue
  - Source: Browser+ rows
  - Logic: `row.isVideo && row.thumbnailStatus === "Missing"`
  - Issue: should read queue `state.thumbnail=false`.

- Deck Queue
  - Source: Browser+ rows
  - Logic: `row.rvtr && row.deckStatus === "Deck Missing"`
  - Issue: should read queue `matched=true && package=true && state.deck=false`.

- Publish Queue
  - Source: package index
  - Logic: status `approved` or `cards_ready`
  - Issue: publish approval is no longer a Factory dashboard concept.

### Normalized Work Buckets

- Component: `app/ops/automation-factory/page.tsx`
- Data source: `model.queueBuckets`
- File path: `lib/ops/automation-factory/load-automation-factory.ts`
- Accuracy: mostly stale

Bucket audit:

- Active Missing
  - Source: Browser+ `libraryHealth.missingThumbnail`
  - Accurate: no

- Repairable
  - Source: Browser+ `libraryHealth.repairableThumbnail`
  - Accurate: no

- Requires Generation
  - Source: Browser+ `libraryHealth.requiresGenerationThumbnail`
  - Accurate: no

- Vault Missing
  - Source: Browser+ `libraryHealth.vaultMissingThumbnail`
  - Accurate: no

- Package Candidates
  - Source: `backfill-queue.json`
  - Logic: `filter === "missing_package"`
  - Accurate: no

- Needs RVTR
  - Source: Browser+ `libraryHealth.missingRvtr`
  - Accurate: no

- Cover First
  - Source: `backfill-queue.json`
  - Logic: `filter === "missing_cover"`
  - Accurate: no

- Out Of Scope
  - Source: Browser+ `retroverseHealth.outOfScope`
  - Accurate: no

- Cards Ready
  - Source: `package-index.json`
  - Logic: status `cards_ready`
  - Accurate: not a Factory metric

- Approved To Publish
  - Source: `package-index.json`
  - Logic: status `approved`
  - Accurate: not a Factory metric

- Publish Blocked
  - Source: `batch-status.json`
  - Logic: job has `error`
  - Accurate: not a Factory metric

- Identity Blocked
  - Source: `cover-recovery-queue.json`
  - Logic: `validationStatus === "no_rvtr"`
  - Accurate: no

- True Failures
  - Source: `batch-status.json`
  - Logic: status `failed`
  - Accurate: no

- Stale/Duplicate
  - Source: `cover-recovery-report.json`
  - Logic: outcome `failed`
  - Accurate: no

### Worker Details

- Component: `app/ops/automation-factory/page.tsx`
- Data source: each `AutomationFactoryWorker`
- File path: `lib/ops/automation-factory/load-automation-factory.ts`
- Logic: repeats queue depth, blockers, completions, failures, and related report labels
- Accuracy: legacy
- Issue: duplicates stale worker card metrics.

### Attention Gates

- Component: `app/ops/automation-factory/page.tsx`
- Data source: `model.blockers`
- File path: `lib/ops/automation-factory/load-automation-factory.ts`
- Accuracy: not VIDEO-factory authoritative

Gate audit:

- Cover Integrity Hold
  - Source: `/Users/bobhopp/RETROVERSE_PUBLIC/reports/intelligence/cover-integrity-hold.json`
  - Accurate: no, historical report/hold state

- Thumbnail Path / Root Issue
  - Source: legacy thumbnail comparison report mtime
  - Accurate: no

- XML Write Gated
  - Source: hard-coded text
  - Accurate: outdated; matcher now writes through approved backup/write path.

- Identity Requires Approval
  - Source: Browser+ missing RVTR count
  - Accurate: no

- Publish Requires Approval
  - Source: cover hold report and hard-coded approval copy
  - Accurate: not a Factory metric

### Browser+ Handoffs / Planned Work

- Component: `components/ops/automation-factory/BrowserPlusHandoffs.tsx`
- Data source: browser `localStorage`
- Path: `browser localStorage: browser-plus-planned-work`
- Logic: sums actions `Find Cover`, `Resolve RVTR`, `Generate Package`, `Generate Deck`, `Publish`
- Accuracy: explicitly forbidden
- Issue: should be removed.

### Data Sources Table

- Component: `app/ops/automation-factory/page.tsx`
- Data source: `model.sources`
- File path: `lib/ops/automation-factory/load-automation-factory.ts`
- Current sources listed:
  - Browser+ health model
  - `backfill-queue.json`
  - `batch-status.json`
  - `package-index.json`
  - `cover-recovery-queue.json`
  - `cover-integrity-hold.json`
  - `cover-recovery-report.json`
  - legacy thumbnail CSV
  - legacy thumbnail publish log
  - Browser+ planned work localStorage
- Accuracy: mostly legacy
- Issue: omits the authoritative queue.

## Incorrect Widgets To Remove

Remove these concepts from Automation Factory:

- Browser+ navigation tabs
- Read-Only Control Layer copy
- Future approval/start buttons
- Running / Needs Approval / Blocked / Disabled worker summary
- What Should Bob Do Next recommendation cards
- `Review N Identity Matches`
- Planned Work
- Browser+ Handoffs
- Approval Gates
- Attention Gates
- Publish Pipeline worker
- Read-only queue snapshots sourced from Browser+
- Normalized Work Buckets
- Historical report source table
- Any metric sourced primarily from `loadBrowserPlusModel()`
- Any metric sourced from `backfill-queue.json`
- Any metric sourced from `batch-status.json`
- Any metric sourced from legacy thumbnail reports
- Any metric sourced from browser `localStorage`

## Replacement Architecture

Create a new Automation Factory model owned by:

- `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/video-work-queue.json`
- `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/package-index.json`
- `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/packages/*.json`
- `/Users/bobhopp/RETROVERSE_PUBLIC/data/ops/intelligence/deck-index.json`
- current cover state from VDJ/package/recovered cover queue
- current thumbnail sidecar state from queue refresh logic

Primary model should be:

```ts
type VideoFactoryDashboardModel = {
  updatedAt: string;
  counts: {
    totalVideoRvtrs: number;
    complete: number;
    missingPackage: number;
    missingDeck: number;
    missingCover: number;
    missingThumbnail: number;
  };
  runtime: {
    currentWorker: string | null;
    currentRvtr: string | null;
    lastCompleted: string | null;
    processedToday: number;
    remaining: number;
    eta: string | null;
  };
  recentActivity: Array<{
    time: string;
    worker: string;
    rvtr: string | null;
    title: string | null;
    artist: string | null;
    result: string;
    detail: string;
  }>;
};
```

Replacement screen should answer only:

- TOTAL VIDEO RVTRS
- COMPLETE
- MISSING PACKAGE
- MISSING DECK
- MISSING COVER
- MISSING THUMBNAIL
- CURRENT WORKER
- CURRENT RVTR
- LAST COMPLETED
- PROCESSED TODAY
- REMAINING
- ETA
- RECENT ACTIVITY

## Replacement Query Logic

All count metrics should come from `video-work-queue.json`.

- TOTAL VIDEO RVTRS
  - Source: `queue.counts.uniqueVideoRvtrs`
  - Fallback: `queue.items.length`

- COMPLETE
  - Source: `queue.counts.complete`
  - Logic: queue refresh currently computes package + deck + cover + thumbnail complete.

- MISSING PACKAGE
  - Source: `queue.counts.missingPackage`
  - Logic: `queue.items.filter(item => item.state.matched && !item.state.package).length`

- MISSING DECK
  - Source: `queue.counts.missingDeck`
  - Logic: `queue.items.filter(item => item.state.package && !item.state.deck).length`

- MISSING COVER
  - Source: `queue.counts.missingCover`
  - Logic: `queue.items.filter(item => !item.state.cover).length`

- MISSING THUMBNAIL
  - Source: `queue.counts.missingThumbnail`
  - Logic: `queue.items.filter(item => !item.state.thumbnail).length`

- CURRENT WORKER
  - Source: new factory runtime state file or parsed recent activity from `video-factory:loop`
  - Recommended new file: `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/video-factory-runtime.json`
  - Logic: worker currently executing in loop.

- CURRENT RVTR
  - Source: same runtime state file
  - Logic: RVTR currently selected by package/deck/cover worker.

- LAST COMPLETED
  - Source: runtime state file
  - Logic: latest completed worker item.

- PROCESSED TODAY
  - Source: runtime state file
  - Logic: count activity items completed since local midnight.

- REMAINING
  - Source: queue counts
  - Logic: `missingPackage + missingDeck + missingCover + missingThumbnail`

- ETA
  - Source: queue counts + runtime throughput
  - Logic: remaining divided by measured completed items per hour, separated by worker if available.

- RECENT ACTIVITY
  - Source: runtime activity file
  - Recommended new file: `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/video-factory-activity.json`
  - Logic: append-only or rolling latest N loop actions.

## Implementation Plan

1. Replace `loadAutomationFactoryModel()` with a queue-authoritative loader.
   - Read `video-work-queue.json`.
   - Read `package-index.json`.
   - Read current package files only for validation/detail links.
   - Read `deck-index.json`.
   - Read current cover and thumbnail state only through the queue fields.

2. Add factory runtime/activity files.
   - `video-factory-runtime.json`
   - `video-factory-activity.json`
   - Update `tools/intelligence/video-factory.ts` to write current worker/current RVTR/last completed.

3. Replace page sections.
   - Keep one dashboard.
   - Remove diagnostics details blocks.
   - Remove Browser+ tabs and handoffs.
   - Remove all approval and planned-work language.

4. Replace metrics.
   - Render only the allowed count cards and runtime cards.
   - Render one recent activity list from factory activity.

5. Remove `BrowserPlusHandoffs` from the Factory page.
   - The component can remain unused or be deleted in a later cleanup.

6. Update source table or remove it.
   - If kept, list only:
     - `video-work-queue.json`
     - `package-index.json`
     - `packages/*.json`
     - `deck-index.json`
     - `video-factory-runtime.json`
     - `video-factory-activity.json`

## Estimated Files To Change

Minimum implementation:

- `lib/ops/automation-factory/load-automation-factory.ts`
- `app/ops/automation-factory/page.tsx`
- `app/ops/automation-factory/automation-factory.css`
- `tools/intelligence/video-factory.ts`

Likely cleanup:

- `components/ops/automation-factory/BrowserPlusHandoffs.tsx`
- `package.json` only if new runtime/report scripts are added

New runtime files written by the factory loop:

- `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/video-factory-runtime.json`
- `/Users/bobhopp/RETROVERSE_DATA/ops/intelligence/video-factory-activity.json`

## Bottom Line

Automation Factory is currently a legacy Browser+/report dashboard. It is not VIDEO-factory authoritative.

The replacement should be a narrow queue monitor driven by `video-work-queue.json`, with runtime state emitted by `video-factory:loop`. All approval, Browser+, planned work, historical report, and old queue concepts should be removed from the Factory dashboard.
