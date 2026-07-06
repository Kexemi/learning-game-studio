# Reference Map V7 — Gameplay, Menus, Choice Structure

Owner correction: V6 proved visual motion, but the structure still did not show enough game-design intuition. V7 separates **good patterns** from **bad patterns** before changing the product.

## Sources actually consulted

| Reference | What it contributes | Good pattern extracted | Bad pattern to avoid |
|---|---|---|---|
| Hunicke / LeBlanc / Zubek, **MDA Framework** (`artifacts/reference-sources/MDA.pdf`) | Mechanics → dynamics → aesthetics; player experiences aesthetics first. | Start from desired feeling, then make mechanics/menu choices produce it. | Shipping mechanics/features whose emotional result still feels like a web page. |
| **Game Accessibility Guidelines** — same input method for UI and gameplay | Menus must be operable by the same input style as play. | If gameplay is “steer one lever,” menus should also feel like steering/selecting stations with thumb taps. | A game controlled one way and menus controlled like a separate website/form. |
| **Game Accessibility Guidelines** — readable default font size | Small mobile text breaks immersion and fun. | Make primary labels short, large, and glanceable; optional detail belongs in codex/source. | Long explanation blocks, tiny metadata, or labels that require concentration. |
| **Duolingo home path redesign** | A guided path makes the next best action obvious and reduces decision anxiety. | Board screen needs a clear “next ride / route / codex” path, not a generic deck browser. | Exposing a library/menu before the learner knows what to do. |
| **Slay the Spire** structure | Branching map creates meaningful route choice: normal fights, elites, shops, campfires, boss. | Route choice should change risk/reward and upcoming encounter texture. | Choices that are only cosmetic tabs or answer shuffles. |
| **W3C accessibility design tips** | Do not rely on color alone; use labels, states, focus/touch feedback. | Route, station, and settle state need text + visual state + disabled state. | Color-only progress or unlabeled icons that look pretty but don’t explain action. |
| `dogfood` progressive-disclosure reference | First screen: one task, one decision; optional machinery hidden. | Board/Route/Codex are in-world stations; codex is optional disclosure. | Showing deck metadata, XP, source, score, route, and all mechanics at once. |
| `static-web-operational-qa` game-menu reference | Game menu = meaningful slots with active state, mobile thumb labels. | Use 3 station slots: Board / Route / Codex, not a web navbar. | Plain tabs, route escape, hidden active state, or phone overflow. |
| V6 50-round self-play ledger | Visual pass repeatedly found separate web sections and heavy controls. | Fold menus into staged overlays and prove with screenshots. | Treating visual motion as enough while structure remains page-like. |

## Derived pattern language

### 1. Main Gate, Not Home Page
**Context:** the player opens a phone link.  
**Problem:** a website home screen reads as marketing/content before it reads as play.  
**Solution:** first screen is a moving gate with one allowed action after the director settles.  
**Therefore:** V7 keeps the cinematic opening but makes menu choices *stations inside the gate*.

### 2. Station Menu, Not Navbar
**Context:** the player needs mode/menu choices.  
**Problem:** tabs/navbars are web grammar.  
**Solution:** three diegetic station slots with active state: **Board**, **Route**, **Codex**.  
**Therefore:** menus use the same thumb-tap/select grammar as steering.

### 3. Guided Path Before Branching
**Context:** new learner has not learned the game yet.  
**Problem:** too many choices before orientation become decision anxiety.  
**Solution:** default to Guided Path; optional route modes unlock visible stakes.  
**Therefore:** Board is the default station, Route is adjacent, Codex is optional.

### 4. Route Choice Must Change the Run
**Context:** game menus should not be fake chrome.  
**Problem:** mode tabs are meaningless if gameplay does not change.  
**Solution:** route selection changes HP/static/risk/reward and action verbs.  
**Therefore:** Guided Path, Boss Climb, Transfer Trial have different stakes.

### 5. Choice = Verb + Consequence
**Context:** answer choices can read as quiz cards.  
**Problem:** labels like A/B/C/D or generic buttons do not create player agency.  
**Solution:** each lever gets an action verb and stakes line before the answer text.  
**Therefore:** choices become “trace proof / call bluff / apply elsewhere,” not only answer cards.

### 6. Route Preview, Not Progress Bar
**Context:** player needs structure during the ride.  
**Problem:** dots show progress but not upcoming decision texture.  
**Solution:** add a compact route strip showing current + next encounters.  
**Therefore:** the player sees where they are and what kind of challenge comes next.

### 7. Codex as Optional Disclosure
**Context:** source/mechanism context matters for learning.  
**Problem:** always-visible source/explanation makes the game read like an article.  
**Solution:** codex is an optional station summarizing mechanisms and counts.  
**Therefore:** detail exists, but the main path stays playable.

## V7 pass/fail heuristics

PASS:
- Opening still feels like a ride, but the player sees an in-world menu grammar once it settles.
- First action is obvious: Board this ride.
- Route choice changes risk/reward and the language of choices.
- Codex is available but not forced.
- During a run, the route strip tells “now / next” without becoming a dashboard.
- Answer choices read as intentional moves, not quiz buttons.

FAIL:
- Menus read like browser tabs, cards, or a settings page.
- Route choice does not affect mechanics.
- The player must inspect metadata to know what to do next.
- Controls are active before the settle window.
- Text blocks dominate the stage.
