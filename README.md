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

## Game loop

This is not a flashcard viewer or web-page game. A deck runs as an animated story on wheels: story tickets, rolling rail scenery, a rider wheel, scene narration, villain puppets, steering choices, threat/heart state, and an ending/reward screen.

## Verify

```bash
python scripts/audit_question_pack.py --strict
node tests/learning_game_smoke.mjs
```

## Content

- Packs: `content/packs/*.json`
- Manifest: `content/pack-manifest.json`
- Intake skill appends packs only; it does not rebuild this client on routine runs.