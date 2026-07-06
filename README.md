# Mechanism Run

Playable static learning game for forged question packs.

## Play

Canonical phone-openable URL after GitHub Pages deploy:

https://kexemi.github.io/learning-game-studio/

Local smoke fallback only:

```bash
cd C:/Users/receg/AI-OS/Repos/Learning-Game-Studio
python -m http.server 8765 --bind 0.0.0.0
```

Localhost/LAN links are not valid Telegram handoffs; use GitHub Pages for owner testing from phone.

## Experience loop

This is not a flashcard viewer, web-page game, or static card loop. V6 adds a literal 50-round visual self-play lane: Hermes drives phone-browser playtests, sets one big-picture goal per round, captures screenshots, scores the experience, and then applies the strongest findings. The current shell is a fixed-stage ride: opening motion, gated boarding, travel/reveal before input, levers disabled until settle, and explanation only after consequence.

## Verify

```bash
python scripts/audit_question_pack.py --strict
node tests/learning_game_smoke.mjs
node scripts/visual_self_play_50.mjs
python scripts/analyze_visual_self_play.py
```

## Content

- Packs: `content/packs/*.json`
- Manifest: `content/pack-manifest.json`
- Intake skill appends packs only; it does not rebuild this client on routine runs.