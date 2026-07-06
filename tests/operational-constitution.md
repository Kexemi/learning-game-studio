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
| Phone proof | `390x665` smoke captures opening, travel, settled levers, and outcome under `artifacts/learning-game-v6/`. |
| Literal 50 loops | `scripts/visual_self_play_50.mjs` drives 50 phone-browser rounds, each with its own big-picture goal and screenshot. |
| Loop analysis | `scripts/analyze_visual_self_play.py` scores the screenshots and writes a ledger/contact sheet under `artifacts/learning-game-v6/visual-self-play-50/`. |

Command bundle:

```bash
python scripts/audit_question_pack.py --strict
node tests/learning_game_smoke.mjs
node scripts/visual_self_play_50.mjs
python scripts/analyze_visual_self_play.py
```

Expected stdout includes:

```text
AUDIT PASS
VISUAL_SELFPLAY_50_V6_PASS continuous-guided-experience
FIFTY_LOOP_SCREENSHOT_OPENING .../artifacts/learning-game-v6/phone-opening-camera.png
FIFTY_LOOP_SCREENSHOT_TRAVEL .../artifacts/learning-game-v6/phone-travel-locked.png
FIFTY_LOOP_SCREENSHOT_SETTLED .../artifacts/learning-game-v6/phone-settled-levers.png
VISUAL_SELF_PLAY_CAPTURE_PASS 50
VISUAL_SELF_PLAY_ANALYSIS_PASS 50
```
