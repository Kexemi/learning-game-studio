# Learning Game Operational Constitution

The game is a real playable run, not a flashcard viewer, when these gates pass:

| Gate | PASS condition |
|---|---|
| Public phone handoff | GitHub Pages URL is the primary test link for Telegram handoffs. No localhost/LAN as the real link. |
| Mission shell | Home presents decks as missions with threat, encounter count, and start action. |
| Run map | Starting a deck renders a node map with current/cleared/wounded/locked states. |
| Combat loop | Run view contains player HP, boss/threat HP, enemy name/icon, combo, combat log, and battlefield. |
| Choice as move | Each answer is framed as a move; correct answers damage boss and build combo; wrong answers damage player and break combo. |
| Feedback as combat report | Explanation appears after state change, with source anchor, then advances to next encounter. |
| Summary | Final screen shows rank, HP, best combo, threat left, reward, and mechanism tags. |
| Phone viewport | `390x665` smoke has no horizontal overflow and produces `artifacts/learning-game-v2/phone-battle.png`. |

Command bundle:

```bash
python scripts/audit_question_pack.py --strict
node tests/learning_game_smoke.mjs
```

Expected stdout includes:

```text
AUDIT PASS
LEARNING_GAME_SMOKE_PASS browser-game-loop
LEARNING_GAME_SCREENSHOT .../artifacts/learning-game-v2/phone-battle.png
```
