# Learning Game Operational Constitution

The game passes only when the session is a **continuous guided animated experience**, not an animated web page, dashboard, static card game, or quiz screen.

Owner correction: v4 was not enough. The bar is roughly “50 more loops”: from first paint to close, motion/visual staging/guidance carries the player, and the system settles only to let them interact.

| Gate | PASS condition |
|---|---|
| Public phone handoff | GitHub Pages URL is the primary test link for Telegram handoffs. No localhost/LAN as the real link. |
| First second | First paint includes camera/tunnel/world motion. No static hero/page shell. |
| No document browsing | App is fixed-height, no document-scroll experience, no dashboard/page sections as the primary surface. |
| Guided opening | Home has `intro → approach → board`; boarding is disabled until the director settles. |
| Diegetic selection | Deck selection is a boarding capsule/gate, not a generic card grid/list. |
| Moving scene | Run screen has director camera, focus beam, guide orb, rider wheel, claim spirit, rail stream, rail lights. |
| Interaction sanctity | Steering levers are disabled and muted until phase `settled`; early taps do nothing. |
| Scene rhythm | Each learning prompt moves through travel/reveal/settled/outcome phases. |
| Consequence first | Answer changes stage result before explanation/source text appears. |
| Regression bans | Old shell terms/classes (`story-stage`, `story-ticket`, `ticket-dock`, `narrator-bubble`) are absent. |
| Phone proof | `390x665` smoke captures opening, travel, settled levers, and outcome under `artifacts/learning-game-v5/`. |

Command bundle:

```bash
python scripts/audit_question_pack.py --strict
node tests/learning_game_smoke.mjs
```

Expected stdout includes:

```text
AUDIT PASS
FIFTY_LOOP_DIRECTOR_V5_PASS continuous-guided-experience
FIFTY_LOOP_SCREENSHOT_OPENING .../artifacts/learning-game-v5/phone-opening-camera.png
FIFTY_LOOP_SCREENSHOT_TRAVEL .../artifacts/learning-game-v5/phone-travel-locked.png
FIFTY_LOOP_SCREENSHOT_SETTLED .../artifacts/learning-game-v5/phone-settled-levers.png
FIFTY_LOOP_SCREENSHOT_OUTCOME .../artifacts/learning-game-v5/phone-outcome-scroll.png
```
