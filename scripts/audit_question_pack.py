#!/usr/bin/env python3
"""Audit question packs under content/packs/."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKS = ROOT / "content" / "packs"
MANIFEST = ROOT / "content" / "pack-manifest.json"

REQUIRED_TOP = {
    "pack_id",
    "title",
    "source_intake",
    "grounding_status",
    "sources",
    "difficulty_band",
    "questions",
    "critic_notes",
    "forge_version",
}
REQUIRED_Q = {
    "id",
    "stem",
    "choices",
    "correct_index",
    "explanation",
    "mechanism_tags",
    "source_anchor",
    "transfer_type",
}


def fail(msg: str, strict: bool) -> None:
    print(f"AUDIT FAIL: {msg}")
    if strict:
        sys.exit(1)


def audit_pack(path: Path, strict: bool) -> list[str]:
    issues: list[str] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    missing = REQUIRED_TOP - set(data)
    if missing:
        issues.append(f"{path.name}: missing top-level {sorted(missing)}")
    qs = data.get("questions") or []
    if not qs:
        issues.append(f"{path.name}: no questions")
    for q in qs:
        qmiss = REQUIRED_Q - set(q)
        if qmiss:
            issues.append(f"{path.name}:{q.get('id','?')}: missing {sorted(qmiss)}")
        choices = q.get("choices") or []
        idx = q.get("correct_index")
        if not isinstance(idx, int) or idx < 0 or idx >= len(choices):
            issues.append(f"{path.name}:{q.get('id','?')}: bad correct_index")
        if len(choices) < 2:
            issues.append(f"{path.name}:{q.get('id','?')}: need >=2 choices")
    if issues:
        for i in issues:
            print(f"AUDIT FAIL: {i}")
        if strict:
            sys.exit(1)
    return issues


def audit_manifest(strict: bool) -> None:
    if not MANIFEST.exists():
        fail("pack-manifest.json missing", strict)
        return
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    pack_ids = {p["pack_id"] for p in manifest.get("packs", [])}
    for path in sorted(PACKS.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        pid = data.get("pack_id")
        if pid not in pack_ids:
            fail(f"manifest missing pack_id {pid} for {path.name}", strict)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    if not PACKS.exists():
        fail("content/packs missing", args.strict)
    any_fail = False
    for path in sorted(PACKS.glob("*.json")):
        issues = audit_pack(path, strict=False)
        any_fail = any_fail or bool(issues)
    try:
        audit_manifest(strict=False)
    except SystemExit:
        any_fail = True
    if any_fail and args.strict:
        sys.exit(1)
    if any_fail:
        print("AUDIT WARN: issues found (non-strict)")
        sys.exit(2)
    print("AUDIT PASS")


if __name__ == "__main__":
    main()