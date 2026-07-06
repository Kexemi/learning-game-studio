# Learning Game Operational Constitution

The game passes only when it feels like an **animated story on wheels**, not a web-page quiz or card game.

| Gate | PASS condition |
|---|---|
| Public phone handoff | GitHub Pages URL is the primary test link for Telegram handoffs. No localhost/LAN as the real link. |
| Story frame | Home opens as a cinematic stage with moving sky/rail/wheel art, not a header + cards page. |
| Ticket selection | Decks appear as story tickets/rides; no plain web list as the primary surface. |
| Rolling scene | Run view has a visible rolling road/track, rider, traveler wheel, animated backdrop, and villain/puppet. |
| Scene progression | Questions are scenes on a rail with scene nodes, narration, place/character flavor, and movement between scenes. |
| Choice as steering | Answers are steering moves; correct choices advance the ride and reduce threat, wrong choices wobble/damage the rider. |
| Minimal web chrome | The surface avoids table/card-dashboard feel; visible UI reads as story, ticket, wheel, rail, scene, ride. |
| Summary as ending | Final screen reads like the end of a ride with rank/reward, not a report page. |
| Phone viewport | `390x665` smoke has no horizontal overflow and produces `artifacts/learning-game-v3/phone-story-wheel.png`. |

Command bundle:

```bash
python scripts/audit_question_pack.py --strict
node tests/learning_game_smoke.mjs
```

Expected stdout includes:

```text
AUDIT PASS
LEARNING_GAME_SMOKE_PASS story-on-wheels
LEARNING_GAME_SCREENSHOT .../artifacts/learning-game-v3/phone-story-wheel.png
```
