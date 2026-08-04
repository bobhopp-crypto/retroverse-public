# 07 — Runtime Containment

**Sprint:** Repository Recovery — Cleanup Phase 1  
**Date:** 2026-08-04  
**Scope:** `.gitignore` only, plus this report

## Rule added

```gitignore
.runtime/
```

This is a root-scoped directory rule. It contains only local runtime artifacts and does not match source, reports, tools, canonical data, or checked-in fixtures outside `.runtime/`.

## Ignore configuration inspected

| Location | Relevant outcome |
|---|---|
| Root `.gitignore` | Already ignores caches, build output, `.env*.local`, logs, `tmp`, and selected generated reports. It did **not** ignore `.runtime/`. |
| Nested `.gitignore` | None found. |
| `.git/info/exclude` | Default comment-only template; no active rules. |

## Runtime tracked-file audit

| Check | Result |
|---|---|
| `git ls-files -- .runtime` | **0 paths** |
| `find .runtime -type f` | **1,181 files preserved on disk** |
| `git ls-files --others --exclude-standard -- .runtime` before rule | **1,179 files** |
| `git ls-files --others --exclude-standard -- .runtime` after rule | **0 files** |

The previous inventory referenced two tracked `.DS_Store` paths. The current checkout does **not** track any `.runtime/` files; the audit command above returns zero. The two-file difference between 1,181 physical files and 1,179 pre-rule untracked files is consistent with root `.DS_Store` ignore behavior. No runtime file was deleted, moved, or altered.

## Before / after status

Counts below distinguish the existing recovery reports from all other untracked files.

| Measure | Before `.runtime/` rule | After `.runtime/` rule | Difference |
|---|---:|---:|---:|
| `git status --short` entries | 159 | 160 | +1 (`.gitignore` modification) |
| `git status --porcelain=v1` entries | 159 | 160 | +1 (`.gitignore` modification) |
| Expanded untracked (`git ls-files --others --exclude-standard`) | 1,511 | 333 | −1,178 |
| Expanded untracked excluding `reports/repository-recovery/` | 1,504 | 325 | −1,179 |
| Expanded `.runtime/` untracked | 1,179 | 0 | −1,179 |
| Physical `.runtime/` files | 1,181 | 1,181 | 0 |

The final expanded count includes this newly created report (+1), so the total visible reduction is 1,178. The `.runtime/` reduction itself is exactly 1,179 paths. `git status` collapses an untracked directory such as `.runtime/` into one porcelain entry, while `git ls-files --others --exclude-standard` expands it to individual paths. This is why the runtime change is one directory entry in normal status but 1,179 files in the expanded listing.

## Validation commands and results

```bash
git status --short
git status --porcelain=v1
git ls-files --others --exclude-standard
git ls-files -- .runtime
git ls-files --others --exclude-standard -- .runtime
find .runtime -type f | wc -l
git check-ignore -v .runtime/giveaway-output/example.m4v
git diff --name-only
git diff --cached --name-only
```

Results:

- `git check-ignore` resolves the example runtime artifact to `.gitignore:30:.runtime/`.
- `.runtime/` no longer appears in normal status as untracked noise.
- `reports/repository-recovery/` remains visible as untracked and is not ignored.
- No paths were staged before this checkpoint.
- The 43 pre-existing tracked source modifications remain present; their changed-path fingerprint is unchanged.
- No source files, APIs, routes, Media Lab files, RV03-05 files, RV04-04 files, Keynote files, or runtime artifacts were edited in this sprint.

## Remaining untracked work after containment

**325 non-recovery untracked paths** remain, plus the repository-recovery report directory. They include active source/documentation work in:

- RV03-05 Home Page Factory
- RV04-04 acquisition support and reports
- Media Lab / Woodstock cutter
- Bingo / Giveaway / Keynote source and assets
- BobOS operator modules
- reports, artifacts, outputs, and backup files outside `.runtime/`

## Staged paths

Before the explicit checkpoint stage: **none**.

The intended stage set for the checkpoint is exactly:

```text
.gitignore
reports/repository-recovery/07-runtime-containment.md
```

## Safety confirmation

- No deletion, move, rename, restore, reset, clean, or bulk staging was performed.
- No runtime artifact was removed from disk.
- No push was performed.
- The existing RV04-04 checkpoint commit remains unchanged at `19f64d634f232bc8ed722e62950a0f982d7d2f76`.
