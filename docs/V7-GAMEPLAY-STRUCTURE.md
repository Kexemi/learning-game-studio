# V7 Gameplay / Menu Structure

Derived from `docs/REFERENCE-MAP-V7.md`.

## Core diagnosis

V6 proved that the app can look animated. It still needed stronger **choice architecture**:

- menus needed to be a game layer, not a hidden web shell;
- route choice needed real consequence;
- answer choices needed to read as player moves;
- progress needed to show upcoming encounter structure, not just dots.

## V7 structure

```text
Open cinematic
  ↓
Station Gate
  ├─ Board  → default next ride, one clear action
  ├─ Route  → choose Guided Path / Boss Climb / Transfer Trial
  └─ Codex  → optional mechanism disclosure
  ↓
Run
  ├─ Travel     → no inputs, route strip shows now/next
  ├─ Reveal     → claim spirit enters beam, still no input
  ├─ Settled    → levers unlock, each is verb + answer + stakes
  └─ Outcome    → stage reaction first, explanation/source second
  ↓
Arrival summary
```

## Menu model

| Station | Player question answered | Game design reason |
|---|---|---|
| **Board** | “What do I do now?” | Guided-path default; reduces first-screen anxiety. |
| **Route** | “How hard / what style is this run?” | Branch choice with actual risk/reward mechanics. |
| **Codex** | “What mechanisms are inside?” | Progressive disclosure without turning the main flow into an article. |

## Route modes

| Route | Mechanical effect | Choice-language effect | Intended feeling |
|---|---|---|---|
| **Guided Path** | 100 heart, baseline static/hit | trace proof / name mechanism / hold units / reject decoy | first-run confidence; Duolingo-style next best step |
| **Boss Climb** | lower heart, higher static reward and hit risk | call bluff / cut false path / pressure test / lock claim | Slay-the-Spire style risk/reward |
| **Transfer Trial** | modest risk, less scaffolding | apply elsewhere / find boundary / choose exception / compress rule | mastery / no-hint application |

## Choice architecture

Bad v6 shape:

```text
[answer text]
[answer text]
[answer text]
[answer text]
```

V7 shape:

```text
[action verb]
answer text
risk/reward stakes
```

The answer is still the learning payload, but the first thing the player reads is an intention: trace, name, hold, reject, pressure-test, apply.

## Verification implications

Tests must prove:

- `station-menu`, `route-chooser`, `codex-panel`, and `route-strip` exist.
- The debug marker is `reference-structure-v7`.
- Route choice can be changed before a run.
- A run remembers `routeMode`.
- Route strip nodes appear during travel/settle.
- Levers expose `data-move` verbs and stakes text.
- Inputs are still hard-gated until settle.
- The 50-round harness captures menu/route/codex phases, not just the ride phases.
