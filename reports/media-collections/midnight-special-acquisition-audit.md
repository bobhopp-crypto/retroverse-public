# Midnight Special — Acquisition Audit

**Audited:** 2026-06-09  
**Collection:** `midnight_special`  
**Data root:** `/Users/bobhopp/RETROVERSE_DATA/media_collections/midnight_special`  
**Mode:** Read-only — no downloads, no processing, no manifest writes.

---

## Summary

| Question | Answer |
|----------|--------|
| Is acquisition complete? | **Yes — for all obtainable episodes** |
| Why 163 folders but UI shows 161? | **161 valid MP4s; 2 empty folders are failed private YouTube videos** |
| Are dashboard download counts stale? | **No — 161 is correct** |
| What is stale? | **`collection.status` still `acquiring`; embedded `manifest.json` snapshot shows `downloaded_count: 0`** |

---

## Counts (source of truth: disk + ffprobe via `auditCollectionDownloadHealth`)

| # | Metric | Count |
|---|--------|------:|
| 1 | Episode manifests (`episodes/*.json`) | **163** |
| 2 | Episode download folders (`downloads/<youtube_id>/`) | **163** |
| 3 | MP4 files (valid, ≥1 MB, ffprobe duration > 0) | **161** |
| 4 | Partial (`.part`) files | **0** |
| 5 | Corrupt files | **0** |
| 6 | Failed episodes | **2** |
| 7 | Empty download folders | **2** |

### Failed episodes (permanent — private YouTube)

| Episode ID | Title | Folder | MP4 |
|------------|-------|--------|-----|
| `LvmvcjcMqYs` | [Private video] | empty | none |
| `ShREvGjboWk` | [Private video] | empty | none |

Manifest status: `failed` for both. No orphan folders, no missing manifests.

---

## Acquisition health (pipeline audit)

```
Total:       163
Downloaded:  161
Failed:      2
Partial:     0
Corrupt:     0
Remaining:   0
In progress: 0
```

Playlist last scan: **163 videos** (`manifest.json` → `last_scan_episode_count`).

---

## Why UI shows 161 (not stale)

**Source of truth for “Downloaded”:**

1. **Live health audit** — `auditCollectionDownloadHealth()` → filesystem inspect + ffprobe per episode (`lib/ops/media-collections/classify-download.ts`)
2. **Persisted counter** — `collection.json` → `downloaded_count: 161` (synced via `syncCollectionCounts()` after each download)

**UI surfaces:**

| Surface | Field | Value |
|---------|-------|------:|
| Overview card | `downloaded_count` | 161 |
| Detail page | `download_health.downloaded` | 161 |
| Detail page | `download_progress.downloaded` | 161 |

**163 folders ≠ 163 downloaded.** yt-dlp creates a per-episode folder even when download fails; failed episodes leave empty dirs:

- `downloads/ShREvGjboWk/` — empty  
- `downloads/LvmvcjcMqYs/` — empty  

Sidecar files in successful folders: 161 × (`.mp4` + `.info.json` + `.description`) = **483 files** under `downloads/` (storage stat counts all files, not episodes).

---

## Stale / misleading (not download count)

| Item | Current | Should reflect |
|------|---------|----------------|
| `collection.json` → `status` | `acquiring` | `complete` (0 remaining; only unrecoverable failures left) |
| `manifest.json` embedded `collection.downloaded_count` | `0` | Snapshot from first scan; UI reads `collection.json` instead |
| `canDownload` on overview | `episode_count > downloaded_count` → true (163 > 161) | Enables “Download Missing” though nothing obtainable remains |

---

## Verdict

**Midnight Special acquisition is effectively complete.**

- 161 / 163 episodes have validated local MP4s  
- 2 / 163 are permanently failed (private videos on YouTube)  
- 0 partial, 0 corrupt, 0 in-progress  

Dashboard **161 downloaded is accurate**. The gap vs 163 folders is the two failed private episodes, not stale statistics.

---

## Re-run audit

```bash
npx tsx tools/media-collections/audit-downloads.ts midnight_special
```
