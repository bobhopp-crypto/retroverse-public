# Studio Production Run Report

Started: 2026-06-28T00:16:52.159Z
Finished: 2026-06-28T00:16:56.209Z

## Before

# Studio Pipeline Health

Generated: 2026-06-28T00:16:52.115Z
Video library rows: 1138

**Collector**
  Running: 1
  Waiting: 6889
  Complete: 200

**Editor**
  Running: 0
  Waiting: 148
  Complete: 52

**Director**
  Running: 0
  Waiting: 0
  Complete: 52

**Publisher**
  Running: 0
  Waiting: 51
  Complete: 1

**Published**
  Total: 1

## Stuck points
- Editor complete, not handed to Director: **0**
- Editor submitted, Director not started: **0**
- Director complete, Publisher not evaluated: **0**


## Run summary

| Metric | Value |
| --- | --- |
| Attempted | 10 |
| Published | 10 |
| Partial | 0 |
| Failed | 0 |

## Results

| Song | RVTR | Status | Director | Publisher |
| --- | --- | --- | --- | --- |
| Electric Avenue | RVTR800065 | published | skipped | approved |
| Sledgehammer | RVTR381289 | published | skipped | approved |
| Got My Mind Set On You | RVTR741425 | published | skipped | approved |
| Radar Love | RVTR842181 | published | skipped | approved |
| Laid | RVTR386689 | published | skipped | approved |
| Jungle Love | RVTR671133 | published | skipped | approved |
| Rhiannon | RVTR097615 | published | skipped | approved |
| Brimful of Asha | RVTR109015 | published | skipped | approved |
| Polk Salad Annie | RVTR025701 | published | skipped | approved |
| Take On Me | RVTR590442 | published | skipped | approved |

## Transition audit

```
RVTR800065
Collector ✓ — existing package
Editor queued
Editor started
Editor ✓ (0.0s)
Director ✓ — existing render spec
Publisher queued
Publisher started
Publisher ✓ (0.5s)
Published
```
```
RVTR381289
Collector ✓ — existing package
Editor queued
Editor started
Editor ✓ (0.0s)
Director ✓ — existing render spec
Publisher queued
Publisher started
Publisher ✓ (0.4s)
Published
```
```
RVTR741425
Collector ✓ — existing package
Editor queued
Editor started
Editor ✓ (0.0s)
Director ✓ — existing render spec
Publisher queued
Publisher started
Publisher ✓ (0.4s)
Published
```
```
RVTR842181
Collector ✓ — existing package
Editor queued
Editor started
Editor ✓ (0.0s)
Director ✓ — existing render spec
Publisher queued
Publisher started
Publisher ✓ (0.4s)
Published
```
```
RVTR386689
Collector ✓ — existing package
Editor queued
Editor started
Editor ✓ (0.0s)
Director ✓ — existing render spec
Publisher queued
Publisher started
Publisher ✓ (0.4s)
Published
```
```
RVTR671133
Collector ✓ — existing package
Editor queued
Editor started
Editor ✓ (0.0s)
Director ✓ — existing render spec
Publisher queued
Publisher started
Publisher ✓ (0.4s)
Published
```
```
RVTR097615
Collector ✓ — existing package
Editor queued
Editor started
Editor ✓ (0.0s)
Director ✓ — existing render spec
Publisher queued
Publisher started
Publisher ✓ (0.3s)
Published
```
```
RVTR109015
Collector ✓ — existing package
Editor queued
Editor started
Editor ✓ (0.0s)
Director ✓ — existing render spec
Publisher queued
Publisher started
Publisher ✓ (0.3s)
Published
```
```
RVTR025701
Collector ✓ — existing package
Editor queued
Editor started
Editor ✓ (0.0s)
Director ✓ — existing render spec
Publisher queued
Publisher started
Publisher ✓ (0.3s)
Published
```
```
RVTR590442
Collector ✓ — existing package
Editor queued
Editor started
Editor ✓ (0.0s)
Director ✓ — existing render spec
Publisher queued
Publisher started
Publisher ✓ (0.4s)
Published
```


