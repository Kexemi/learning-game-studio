# Deck preview: Segmented tool batch dispatch (9 Q)

**Source:** [Teknium announcement and diagram](https://x.com/teknium/status/2077132644979200150)

**Pack:** `content/packs/teknium-segmented-tool-batch-dispatch-20260715.json`

| # | Mechanism focus |
|---|-----------------|
| 1 | Old mixed-batch all-or-nothing serialization failure |
| 2 | Safe parallel run followed by unsafe barrier |
| 3 | Multiple segments around a middle barrier |
| 4 | Why contiguous runs preserve causality |
| 5 | Overlapping file-path conflict handling |
| 6 | Published invariants versus an overclaim |
| 7 | Bounded reading of the 42% live-E2E result |
| 8 | **No-hint** side-effect and observation scheduling |
| 9 | Malformed-call containment without poisoning safe runs |

**Forge profile:** `failure-lab`

**Grounding:** `VERIFIED` from the exact X post/diagram and [upstream implementation commit `271a9d8`](https://github.com/NousResearch/hermes-agent/commit/271a9d8ec6ada347375921a7995001b35ad89954).

**Critic:** This teaches the published design, implementation branches, and claim boundaries. The new code was inspected but not executed on this machine's older Hermes runtime, and the reported 42% result remains specific to the stated workload.
