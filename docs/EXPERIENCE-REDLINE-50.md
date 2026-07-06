# Experience Redline — 50-Loop Standard

Owner correction: v4 was directionally better, but still nowhere near enough. The target is not “animated UI.” The target is a continuous guided experience where the player is carried from open to close by motion, visuals, staging, and guidance, with interaction only at deliberate settle windows.

## Target spine

> The player should feel like they boarded an animated idea-machine. Reading happens inside the ride; buttons appear only when the ride stops and asks them to steer.

## Literal 50 visual self-play loop distilled into v6 requirements

| Loop | Critique pressure | v6 move |
|---:|---|---|
| 1 | It still has page sections | Collapse into one fixed-height stage, no document scroll |
| 2 | Tickets look like cards | Turn deck choice into a boarding gate with one active capsule |
| 3 | Opening feels like hero content | Add camera shutter, tunnel, guide orb, moving set pieces |
| 4 | Guidance is copy, not direction | Make guide line change by phase and gate input |
| 5 | Question appears too soon | Travel → reveal → settle phases before answer input |
| 6 | Choices are visible too often | Decision rack stays dim/locked until settle |
| 7 | UI chrome competes with stage | Convert HUD into small diegetic meter lights |
| 8 | Progress strip reads as web UI | Use rail lights embedded in stage |
| 9 | Answers read like buttons | Render as steering levers with verbs + payload |
| 10 | Explanations feel like quiz feedback | Make them outcome scrolls after animation |
| 11 | Scene world is thin | Add place, spirit, guide, beam, rider, track per scene |
| 12 | Movement is decoration | Phase changes alter camera/track/character motion |
| 13 | No camera language | Add director-camera zoom/phase data attributes |
| 14 | No first-second hook | First paint starts curtain/tunnel/orb motion |
| 15 | Still could be a website | Ban static document/body scroll and dashboard words |
| 16 | Too much simultaneous text | One guide line + one question + one cue only |
| 17 | Not enough sense of travel | Parallax tunnel + track rush + rider wheel always moving |
| 18 | Interaction is not sacred | Choices disabled until phase `settled`; early taps ignored |
| 19 | Outcome lacks consequence | Stage result switches to `clear`/`wobble` before scroll appears |
| 20 | Ending reads like stats | Ending is arrival scene with reward spoken as ride memory |
| 21 | Guide is not a character | Add floating guide orb + focus beam |
| 22 | The player is passive too long | Boarding gate appears after opening settle, not hidden forever |
| 23 | The player can miss what to do | Cue text is phase-specific and centered above controls |
| 24 | Cards feel generic | Use levers/capsules/rail lights vocabulary in DOM + CSS |
| 25 | Old v4 terms leak | Replace story/ticket/chrome labels with cockpit/stage/director terms |
| 26 | Motion not testable | Smoke asserts phase lock, disabled choices, screenshots |
| 27 | Visual proof too narrow | Capture opening, travel, settle, outcome, contact sheet |
| 28 | Could regress to card shell | Static contract asserts v6 markers and banned old selectors absent |
| 29 | Phone browser height risky | Smoke uses 390×665 phoneBrowser viewport |
| 30 | Web page scroll would kill it | `body`/app/frame fixed; smoke checks overflow |
| 31 | Background lacks depth | Add aurora, tunnel rings, parallax hills, spark field |
| 32 | Progress should be diegetic | Use rail bulbs in cockpit deck |
| 33 | Boss feels abstract | Use claim spirit that floats/shakes per result |
| 34 | Correctness should be felt | Correct speeds/brightens wheel; wrong wobbles scene |
| 35 | It needs rhythm | Timed phases with explicit director hooks |
| 36 | Learning source gets buried | Source line remains but only after outcome |
| 37 | Too much UI at home | Home has cinematic stage + one boarding gate |
| 38 | Selection should feel like boarding | Button copy: “Board this ride” |
| 39 | Player should never wonder | Every state has guide cue |
| 40 | Mechanical tests can lie | Add screenshots/contact sheet proof alongside assertions |
| 41 | Need stronger affordance | Decision rack pulses only when ready |
| 42 | Need stronger settle moment | Phase data dims motion and brightens choice rack |
| 43 | Need less rectangle energy | Heavy use of circles, rails, beams, capsules, masks |
| 44 | Need better first 30 seconds | Opening → boarding → travel visible in smoke path |
| 45 | Need fewer dashboard numbers | Heart/static are tiny meter chips, not dashboard panels |
| 46 | Need visible guidance from open to close | Guide text exists on home, travel, reveal, settle, outcome, ending |
| 47 | Need internal standard | Constitution updated to reject static pages/card games |
| 48 | Need deterministic proof | Smoke stdout `VISUAL_SELFPLAY_50_V6_PASS` |
| 49 | Need honest deploy gate | Commit locally; public push only after approval |
| 50 | Need next-loop readiness | Keep artifacts and tests so the next 50 loops start from truth |

## V6 PASS gates

- First paint is cinematic motion, not a page.
- Home interaction is blocked until the director settles the opening.
- Run choices are impossible until the scene reaches `settled`.
- Every learning question is embedded in a moving travel/reveal/settle sequence.
- Outcome animation happens before explanation text.
- Phone proof includes opening, travel, settle, outcome, and contact sheet.
