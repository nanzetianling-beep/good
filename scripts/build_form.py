"""① 導入アンケートのHTMLプレビューを spec/items.yaml から生成する。

使い方: python scripts/build_form.py  → form/preview/index.html
"""

from __future__ import annotations

import base64
import json
import mimetypes
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_items import load_spec  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "templates" / "form" / "preview.html"
OUT = ROOT / "form" / "preview" / "index.html"

# プレビューで使うキーだけを渡す
KEYS = ["id", "label", "type", "required", "options", "other", "unknown_option", "option_images",
        "skip_to_on", "show_if", "unit", "placeholder", "default", "hint", "body", "validation",
        "columns", "cells", "examples"]


def _image_uri(path: str) -> str | None:
    """見本画像をページに埋め込む(無ければ None。ページ側で「準備中」を出す)。"""
    f = ROOT / path
    if not f.exists():
        return None
    mime = mimetypes.guess_type(f.name)[0] or "image/png"
    return f"data:{mime};base64," + base64.b64encode(f.read_bytes()).decode()


def form_spec(spec: dict) -> dict:
    sections = []
    for sec in spec["sections"]:
        items = [
            {k: ([_image_uri(x) for x in it[k]] if k == "option_images" else it[k]) for k in KEYS if k in it}
            for it in spec["items"]
            if it["route"] == "form" and it["section"] == sec["id"]
        ]
        sections.append({"id": sec["id"], "title": sec["title"], "desc": sec["desc"], "items": items})
    return {"form": spec["form"], "sections": sections}


def build(spec: dict) -> str:
    data = json.dumps(form_spec(spec), ensure_ascii=False).replace("</", "<\\/")
    return TEMPLATE.read_text(encoding="utf-8").replace("/*__SPEC_JSON__*/null", data)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(build(load_spec()), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
