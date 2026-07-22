# Booth — Production Deployment + Live Validation

**Deploy commit:** `d92a2da71c639626563d62735822d0bf63698559`  
**Production URL:** https://retroverse.live  
**Deployment:** `https://retroverse-public-3abade0fn-bobhopp-1585s-projects.vercel.app` (aliases → retroverse.live)  
**Evidence:** `artifacts/booth-production-deploy/production-validation.json`

---

## Pre-deploy

| Check | Result |
|---|---|
| Working tree clean | **No** — large unrelated WIP remains uncommitted (Pass/PWA/etc.). Deploy used a **Booth-scoped commit only**. |
| Booth tests | **Pass** (49) |
| TypeScript (studio + live) | **Pass** |
| Production Live build (local) | **Blocked locally** by concurrent dirty Live/pass WIP; **cloud build succeeded** for deploy commit |
| Debug / temp flags in Booth | **None found** |
| Commit hash recorded | `d92a2da71c639626563d62735822d0bf63698559` |

---

## Deploy

- Pushed Booth-scoped commit to `origin/main`
- CLI `vercel --prod` failed (request body > 10mb) — GitHub→Vercel integration built production instead
- Production deployment **Ready** and aliased to **https://retroverse.live**
- GitHub deployment record SHA matches `d92a2da71…`

---

## Smoke test

| Surface | Result |
|---|---|
| Studio Booth `/bobos/booth` | 200 |
| Production https://retroverse.live | 200 |
| Production playhead API | 200 |
| Broadcast publisher (push → Confirmed) | Confirmed on GO LIVE / NEXT / TAKE / RETURN |
| Local Live `:3100` | **500** during validation (local only; not production) |
| VirtualDJ bridge | **Not healthy / not playing** during validation (synthetic RVTR used for TAKE) |
| Runtime lamps | Not separately green-checked this run |

---

## Public validation (production)

Sequence executed from local Studio → production push → `retroverse.live` playhead:

| Step | Prod item | Public confidence | Sync |
|---|---|---|---|
| Load Show | LIVE AID | — (no publish) | OK |
| GO LIVE | LIVE AID | Confirmed | OK |
| NEXT | A Famine… | Confirmed | OK |
| NEXT | The Closest Thing… | Confirmed | OK |
| TAKE VirtualDJ | To Love Somebody (RVTR604727) | Confirmed | OK · **not live bridge** |
| RETURN | The Closest Thing… (exact frozen) | Confirmed | OK |
| PAUSE + hold | same | Confirmed | OK |
| RESUME | same | Confirmed | OK |
| END SHOW | session cleared | standby | OK |
| Re-Load Show | LIVE AID | no ownership storm | OK |

---

## Device verification

| Device | Result |
|---|---|
| Desktop browser (API + prior local UI) | Production playhead verified via API |
| Phone Wi‑Fi | **Not run** |
| Phone cellular | **Not run** |
| Public TV / kiosk | **Not run** |

---

## Recovery tests

| Test | Result |
|---|---|
| Re-Load Show after END | Pass — first valid RVBA, no duplicate air key storm |
| Booth browser refresh mid-show | **Not run** |
| Studio restart mid-show | **Not run** |

---

## Mock show timeline

Compressed production validation (~2 minutes of cuts), not a 20–30 minute supervised rehearsal.  
Full step log: `artifacts/booth-production-deploy/production-validation.json`.

---

## Issues discovered

1. Local working tree still dirty with unrelated Pass/PWA work — do not mix into Booth deploys.
2. Local `vercel --prod` upload hits 10mb limit — rely on Git integration.
3. Local Live `:3100` returned 500 after local WIP/stash churn — unrelated to production.
4. VirtualDJ bridge was not providing a live track during production TAKE.
5. Phone / TV / 20–30 minute supervised rehearsal still outstanding.

---

## Recommended fixes

1. Before first event: start VDJ bridge; re-run TAKE with live RVTR; confirm production Now Playing.
2. Run supervised 20–30 minute mock show without mid-run repairs; log observations only.
3. Verify phone Wi‑Fi + cellular against https://retroverse.live during that rehearsal.
4. Practice Booth refresh + Studio restart mid-show once.
5. Keep Pass/PWA WIP on a separate branch from Booth production deploys.

---

## Final verdict

### NOT READY

**Blockers preventing a real event tonight:**

1. **Real VirtualDJ bridge TAKE** not validated on production (bridge not live during deploy validation).
2. **Supervised 20–30 minute rehearsal** not completed.
3. **Phone (Wi‑Fi + cellular)** device verification not completed.

Production Booth→`retroverse.live` Program cuts **do** work with Confirmed public sync on commit `d92a2da71`. Clear the three blockers above, then re-issue the verdict.
