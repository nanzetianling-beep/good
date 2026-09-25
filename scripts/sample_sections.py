"""既存見本 reference/survey_sample.html から SECTIONS 定義の質問を抜き出す。

使い方: python scripts/sample_sections.py  → セクションごとの質問ラベルをJSONで出力
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE = ROOT / "reference" / "survey_sample.html"

_SECTIONS_RE = re.compile(r"const SECTIONS = \[(.*?)\n\];", re.S)
_SECTION_RE = re.compile(r'\{\s*id:"(?P<id>\w+)", title:"(?P<title>[^"]+)"')
_QUESTION_RE = re.compile(r'\{t:T\.(?P<type>[A-Z]+), l:"(?P<label>[^"]*)"')


def load_sample_sections(path: Path = SAMPLE) -> list[dict]:
    """[{id, title, questions: [{type, label}]}] を見本の並び順で返す。"""
    html = path.read_text(encoding="utf-8")
    body = _SECTIONS_RE.search(html)
    if body is None:
        raise ValueError(f"SECTIONS が見つかりません: {path}")
    text = body.group(1)
    heads = list(_SECTION_RE.finditer(text))
    sections = []
    for i, head in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        questions = [
            {"type": q["type"].lower(), "label": q["label"]}
            for q in _QUESTION_RE.finditer(text, head.end(), end)
        ]
        sections.append({"id": head["id"], "title": head["title"], "questions": questions})
    return sections


if __name__ == "__main__":
    print(json.dumps(load_sample_sections(), ensure_ascii=False, indent=2))
