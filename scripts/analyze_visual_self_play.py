from __future__ import annotations

import json
from pathlib import Path
from statistics import mean
from PIL import Image, ImageChops, ImageFilter, ImageStat, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "learning-game-v6" / "visual-self-play-50"
RAW = ART / "raw-rounds.json"
LEDGER = ART / "visual-self-play-ledger.md"
SUMMARY = ART / "visual-self-play-summary.json"
CONTACT = ART / "visual-self-play-contact-sheet.png"


def image_metrics(path: Path) -> dict:
    im = Image.open(path).convert("RGB")
    small = im.resize((120, max(1, int(120 * im.height / im.width))))
    colors = len(set(small.getdata()))
    stat = ImageStat.Stat(im)
    gray = im.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_mean = ImageStat.Stat(edges).mean[0]
    hist = gray.histogram()
    total = im.width * im.height
    dark = sum(hist[:36]) / total
    bright = sum(hist[210:]) / total
    mid = sum(hist[70:170]) / total
    return {
        "size": [im.width, im.height],
        "mean_rgb": [round(x, 2) for x in stat.mean],
        "std_rgb": [round(x, 2) for x in stat.stddev],
        "sample_colors": colors,
        "edge_mean": round(edge_mean, 2),
        "dark_ratio": round(dark, 4),
        "bright_ratio": round(bright, 4),
        "mid_ratio": round(mid, 4),
    }


def score_round(round_: dict, img: dict) -> tuple[float, str, str]:
    m = round_["metrics"]
    phase = round_["phase"]
    stage = m.get("stageRatio") or 0
    controls = m.get("controlRatio") or 0
    buttons = m.get("buttonCount") or 0
    enabled = m.get("enabledButtonCount") or 0
    text_chars = m.get("textChars") or 0
    overflow = max(0, (m.get("scrollWidth") or 0) - (m.get("clientWidth") or 0))
    color = min(1.0, img["sample_colors"] / 9000)
    edge = min(1.0, img["edge_mean"] / 34)
    darkness_ok = 1.0 - max(0, img["dark_ratio"] - 0.62)

    score = 45 + 20 * min(stage / 0.74, 1) + 12 * color + 8 * edge + 8 * darkness_ok
    score -= 7 * min(controls / 0.24, 1)
    score -= 5 if overflow else 0
    score -= 4 if text_chars > 760 else 0
    if phase in {"opening", "travel"} and enabled > 1:
        score -= 8
    if phase == "settled" and enabled < 2:
        score -= 12
    if phase == "outcome" and controls > 0.24:
        score -= 6
    score = max(0, min(100, round(score, 1)))

    findings = []
    if stage < 0.68:
        findings.append("stage does not dominate enough")
    if controls > 0.22:
        findings.append("control surface is too visually heavy")
    if color < 0.65:
        findings.append("visual world could use richer depth/color variation")
    if edge < 0.55:
        findings.append("scene reads too soft/flat in screenshot")
    if text_chars > 760:
        findings.append("reading burden is high for a ride beat")
    if overflow:
        findings.append("horizontal overflow risk")
    if phase in {"opening", "travel"} and enabled > 1:
        findings.append("too many active controls before settle")
    if phase == "settled" and enabled < 2:
        findings.append("settled phase lacks active steering")
    if not findings:
        findings.append("passes this loop's visual/interaction probe")

    action = "Keep as receipt"
    if "stage does not dominate enough" in findings or "control surface is too visually heavy" in findings:
        action = "Fold controls into the stage as overlays; remove separate section feel"
    elif "richer depth" in " ".join(findings) or "flat" in " ".join(findings):
        action = "Increase parallax/depth/lighting and staged objects"
    elif "reading burden" in " ".join(findings):
        action = "Shorten phase copy and make guide/cue do more work"
    elif "too many active controls" in " ".join(findings):
        action = "Keep input hard-gated until settle"
    return score, "; ".join(findings), action


def make_contact(rounds: list[dict]) -> None:
    picks = [1, 4, 7, 13, 19, 31, 40, 50]
    thumbs = []
    for idx in picks:
        r = rounds[idx - 1]
        im = Image.open(r["screenshot"]).convert("RGB")
        im.thumbnail((185, 315))
        thumbs.append((idx, r["phase"], im.copy()))
    w = sum(im.width for _, _, im in thumbs) + 14 * (len(thumbs) + 1)
    h = max(im.height for _, _, im in thumbs) + 54
    sheet = Image.new("RGB", (w, h), (5, 7, 18))
    d = ImageDraw.Draw(sheet)
    x = 14
    for idx, phase, im in thumbs:
        d.text((x, 8), f"{idx:02d} {phase}", fill=(255, 209, 102))
        sheet.paste(im, (x, 34))
        x += im.width + 14
    sheet.save(CONTACT)


def main() -> None:
    data = json.loads(RAW.read_text(encoding="utf-8"))
    enriched = []
    for r in data["rounds"]:
        img = image_metrics(Path(r["screenshot"]))
        score, finding, action = score_round(r, img)
        enriched.append({**r, "image_metrics": img, "score": score, "finding": finding, "self_goal_action": action})
    make_contact(enriched)
    phase_scores = {}
    for phase in sorted(set(r["phase"] for r in enriched)):
        vals = [r["score"] for r in enriched if r["phase"] == phase]
        phase_scores[phase] = round(mean(vals), 1)
    top_actions = {}
    for r in enriched:
        top_actions[r["self_goal_action"]] = top_actions.get(r["self_goal_action"], 0) + 1
    summary = {
        "pass": len(enriched) == 50,
        "round_count": len(enriched),
        "average_score": round(mean(r["score"] for r in enriched), 1),
        "min_score": min(r["score"] for r in enriched),
        "phase_scores": phase_scores,
        "top_actions": sorted(top_actions.items(), key=lambda x: x[1], reverse=True),
        "contact_sheet": str(CONTACT),
        "ledger": str(LEDGER),
    }
    SUMMARY.write_text(json.dumps({"summary": summary, "rounds": enriched}, indent=2), encoding="utf-8")
    lines = [
        "# Visual Self-Play 50 Ledger",
        "",
        "This is the literal 50-round loop: each round sets its own big-picture visual goal, drives a phone-browser playtest phase, captures a screenshot, scores the visual/interaction state, and records the next self-goal action.",
        "",
        f"- Rounds: {summary['round_count']}",
        f"- Average score: {summary['average_score']}",
        f"- Minimum score: {summary['min_score']}",
        f"- Contact sheet: `{CONTACT}`",
        "",
        "## Phase scores",
        "",
        "| Phase | Avg score |",
        "|---|---:|",
    ]
    for phase, score in phase_scores.items():
        lines.append(f"| {phase} | {score} |")
    lines += ["", "## Top self-goal actions", "", "| Action | Count |", "|---|---:|"]
    for action, count in summary["top_actions"]:
        lines.append(f"| {action} | {count} |")
    lines += ["", "## 50 rounds", "", "| # | Phase | Big-picture goal | Score | Finding | Next self-goal action | Screenshot |", "|---:|---|---|---:|---|---|---|"]
    for r in enriched:
        shot = Path(r["screenshot"]).name
        lines.append(f"| {r['round']} | {r['phase']} | {r['goal']} | {r['score']} | {r['finding']} | {r['self_goal_action']} | `{shot}` |")
    LEDGER.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("VISUAL_SELF_PLAY_ANALYSIS_PASS", summary["round_count"])
    print("VISUAL_SELF_PLAY_AVERAGE", summary["average_score"])
    print("VISUAL_SELF_PLAY_MIN", summary["min_score"])
    print("VISUAL_SELF_PLAY_CONTACT", CONTACT)
    print("VISUAL_SELF_PLAY_LEDGER", LEDGER)
    print("VISUAL_SELF_PLAY_SUMMARY", SUMMARY)


if __name__ == "__main__":
    main()
