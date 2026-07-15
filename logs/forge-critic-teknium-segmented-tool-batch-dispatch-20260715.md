# Forge working set — Teknium segmented tool batch dispatch

- **Goal:** Convert the exact X post into one append-only, mechanism-first learning-game deck.
- **Pass:** 6–10 grounded questions; at least one failure mode, tradeoff/claim-bound item, and no-hint transfer; manifest entry; strict audit green; no client files changed.
- **Source:** https://x.com/teknium/status/2077132644979200150
- **Source state:** VERIFIED through X search plus image understanding of the attached diagram, then reconciled against upstream implementation commit `271a9d8` and its segmentation tests.
- **Runtime state:** Local Hermes is v0.18.2 at `aaf569126`, 243 commits behind `origin/main`; segmented dispatch is not present locally. Runtime update/restart was not authorized or attempted.
- **Skills loaded:** `learning-game-intake-forge`, `material-thinking`.
- **Live paths read:** `content/pack-manifest.json`, `scripts/audit_question_pack.py`, existing BadB01E pack and preview.
- **Primary mechanism:** Partition an emitted mixed batch into contiguous parallel-safe runs separated by sequential barriers while preserving result and emission order.
- **Published invariants:** one result per call in order; no call starts before an earlier barrier ends; overlapping paths split into ordered runs; budget and steer finalize once per turn.
- **Published evidence:** 22 new tests; 5,643 agent-suite tests green; live E2E 1.16 s vs 2.0 s sequential; 42% cut on the stated 3-read + 1-barrier case.
- **Unknown/risk:** The upstream code and 400-line regression file were inspected but not run on this older local Hermes checkout; the 42% result remains workload-specific.
- **Files delivered:** pack JSON, manifest entry, preview, and this critic log.
- **Verification:** `AUDIT PASS`; semantic check confirms 9 unique questions, 36 choices, 9 anchors, one no-hint transfer item, two sources, and manifest linkage; local HTTP loader resolves the manifest path and loads all 9 questions; exact-scope check confirms four intended paths and zero client-file changes.
- **Current verdict:** `LOCAL_CONTENT_PASS` — the append-only deck is complete and locally playable. Public deployment remains a separate owner gate.
- **Falsifier:** Any missing schema field, unanchored question, wrong answer index, missing manifest entry, client-code diff, strict audit failure, or failed public manifest lookup blocks the corresponding PASS claim.
- **Public state:** GitHub Pages manifest returned HTTP 200 but does not contain this pack (`3` packs currently published).
- **Next:** owner-gated push of the two local commits → poll the public manifest until the pack appears → verify the phone-openable game loads it.
