"""spec/items.yaml を検証し、route ごとの件数を報告する。

使い方: python scripts/validate_items.py
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sample_sections import load_sample_sections  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
ITEMS = ROOT / "spec" / "items.yaml"
SCHEMA = ROOT / "spec" / "items.schema.json"

ROUTES = ["form", "template", "onsite", "fixed"]


def load_spec() -> dict:
    return yaml.safe_load(ITEMS.read_text(encoding="utf-8"))


def check(spec: dict) -> list[str]:
    """スキーマ外の整合性も含めて、問題を文字列のリストで返す(空なら合格)。"""
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    errors = [
        f"schema: {'/'.join(map(str, e.absolute_path))}: {e.message}"
        for e in Draft202012Validator(schema).iter_errors(spec)
    ]
    if errors:
        return errors

    items = spec["items"]
    ids = [it["id"] for it in items]
    for dup in sorted(k for k, v in Counter(ids).items() if v > 1):
        errors.append(f"id が重複しています: {dup}")

    by_id = {it["id"]: it for it in items}
    sections = {s["id"] for s in spec["sections"]}
    themes = {t["id"] for t in spec["themes"]}
    chapters = {c["id"] for c in spec["chapters"]}
    for it in items:
        if it.get("section") and it["section"] not in sections:
            errors.append(f"{it['id']}: 未定義の section {it['section']}")
        if it.get("theme") and it["theme"] not in themes:
            errors.append(f"{it['id']}: 未定義の theme {it['theme']}")
        if "chapter" in it and it["chapter"] not in chapters:
            errors.append(f"{it['id']}: 未定義の chapter {it['chapter']}")
        cond = it.get("show_if")
        if cond:
            parent = by_id.get(cond["item"])
            if parent is None:
                errors.append(f"{it['id']}: show_if の参照先 {cond['item']} がありません")
            elif cond["equals"] not in parent.get("options", []):
                errors.append(f"{it['id']}: show_if の値 {cond['equals']} が {parent['id']} の選択肢にありません")
        # 3章: すべての選択式に「わからない・訪問時に相談」(必須項目を除く)
        if it["route"] == "form" and it["type"] in ("radio", "checkbox", "dropdown"):
            if not it.get("required") and not it.get("unknown_option"):
                errors.append(f"{it['id']}: 選択式なのに unknown_option がありません")

    covered = {(it["source"]["sample"], it["source"]["question"]) for it in items if "sample" in it["source"]}
    for sec in load_sample_sections():
        for q in sec["questions"]:
            if (sec["id"], q["label"]) not in covered:
                errors.append(f"見本の項目が items.yaml にありません: {sec['title']} / {q['label']}")
    known = {(s["id"], q["label"]) for s in load_sample_sections() for q in s["questions"]}
    for key in sorted(covered - known):
        errors.append(f"source が見本に存在しません: {key[0]} / {key[1]}")
    return errors


def report(spec: dict) -> str:
    items = spec["items"]
    counts = Counter(it["route"] for it in items)
    from_sample = Counter(it["route"] for it in items if "sample" in it["source"])
    questions = sum(len(s["questions"]) for s in load_sample_sections())
    lines = [
        f"見本の質問数: {questions}",
        f"items.yaml の項目数: {len(items)}(見本由来 {sum(from_sample.values())}・要件定義書で追加 "
        f"{len(items) - sum(from_sample.values())})",
        "",
        "| route | 件数 | うち見本由来 |",
        "|---|---|---|",
    ]
    lines += [f"| {r} | {counts[r]} | {from_sample[r]} |" for r in ROUTES]
    lines.append(f"| 合計 | {len(items)} | {sum(from_sample.values())} |")
    return "\n".join(lines)


def main() -> int:
    spec = load_spec()
    errors = check(spec)
    for e in errors:
        print(f"NG  {e}", file=sys.stderr)
    if errors:
        return 1
    print(report(spec))
    return 0


if __name__ == "__main__":
    sys.exit(main())
