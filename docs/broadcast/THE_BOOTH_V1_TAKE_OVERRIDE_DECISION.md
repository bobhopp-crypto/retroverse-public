# The Booth V1 — TAKE / OVERRIDE Decision Record

**Project:** Retroverse Broadcast  
**Date:** 2026-07-21  
**Status:** Binding clarification for V1 implementation  
**Does not rewrite:** [`THE_BOOTH_V1_FUNCTIONAL_SPECIFICATION.md`](./THE_BOOTH_V1_FUNCTIONAL_SPECIFICATION.md) behavior

---

## Decision

**The Booth V1 intentionally couples routine manual TAKE with OVERRIDE.**

This is a **Version 1 simplification**, not a claim that the two concepts are the same thing.

---

## Conceptual model (authoritative)

| Concept | Answers |
|---|---|
| **Ownership** | Who owns The Air? |
| **Override** | May automation change ownership? |

These are **independent concepts**.

V1 binds them in mechanism:

> Operator TAKE → OVERRIDE on (automation may not change ownership until OVERRIDE clears, per V1 rules).

That binding is deliberate for V1 ship simplicity.

---

## Future versions

Future versions should evaluate whether:

- routine manual TAKE should **only** change ownership, and  
- automation may **resume naturally** afterward (e.g. idle rejoin),  

while:

- **Emergency** operation, and  
- **explicit automation lock**,  

remain valid **OVERRIDE** use cases.

See also: [`THE_BOOTH_SOURCE_OWNERSHIP_VS_OVERRIDE.md`](./THE_BOOTH_SOURCE_OWNERSHIP_VS_OVERRIDE.md) (§6 V2 design note).

---

## Implementation rule

**Do not revisit this coupling during V1 implementation** unless a defect is discovered (behavior disagrees with the V1 Functional Specification as written).

Do not “improve” OVERRIDE-on-TAKE quietly.  
Do not partially unbind TAKE from OVERRIDE in V1.

---

## Execution state

**COMPLETE** — Decision recorded. No V1 behavior change.
