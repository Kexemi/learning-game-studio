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

This is not a flashcard viewer, web-page game, or static card loop. The app runs as a directed animated ride: from first paint there is motion and guidance; the scene settles only when the player should interact. Decks are tickets, questions are scenes, answers are steering moves, and explanations arrive after the outcome animation.

## Verify

```bash
python scripts/audit_question_pack.py --strict
node tests/learning_game_smoke.mjs
```

## Content

- Packs: `content/packs/*.json`
- Manifest: `content/pack-manifest.json`
- Intake skill appends packs only; it does not rebuild this client on routine runs.