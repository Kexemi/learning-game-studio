# Learning Game Operational Constitution

The game passes only when the entire session feels like a **directed animated experience**. It may settle for interaction, but it must never read as a static web page, dashboard, card game, or quiz screen.

| Gate | PASS condition |
|---|---|
| Public phone handoff | GitHub Pages URL is the primary test link for Telegram handoffs. No localhost/LAN as the real link. |
| Immediate motion | From first paint, the surface has continuous animation: curtain/opening, aurora/grain, moving world/track, train/wheels. |
| Directed opening | The opening has phases (`arrival → settling → choose`) with guide text. Tickets are not the whole experience; they appear only after the director settles the scene. |
| Interaction windows | During run scenes, choices are disabled/soft until phase `settled`; the player only interacts at guided quiet moments. |
| Scene director | Each question is a scene with travel and reveal phases before input. The stage has parallax, rider wheel, guide/orb, spirit, caption, and question reveal. |
| Outcome animation | Answering moves the stage into `outcome`, changes visual result, then shows the explanation scroll. |
| Minimal web chrome | No table/card/dashboard language as primary surface. UI terms are ride/ticket/scene/wheel/guide/static/heart. |
| Phone viewport | `390x665` smoke has no horizontal overflow and produces `artifacts/learning-game-v4/phone-directed-experience.png`. |

Command bundle:

```bash
python scripts/audit_question_pack.py --strict
node tests/learning_game_smoke.mjs
```

Expected stdout includes:

```text
AUDIT PASS
LEARNING_GAME_SMOKE_PASS continuous-directed-animation
LEARNING_GAME_SCREENSHOT .../artifacts/learning-game-v4/phone-directed-experience.png
```
