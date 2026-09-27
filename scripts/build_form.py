"""① 導入アンケートのHTMLプレビューを spec/items.yaml から生成する。

使い方: python scripts/build_form.py  → form/preview/index.html
        python scripts/build_form.py --site DIR → DIR に店舗へ配る公開用ページ(Vercel などに置く)
"""

from __future__ import annotations

import base64
import json
import mimetypes
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_items import load_spec  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "templates" / "form" / "preview.html"
OUT = ROOT / "form" / "preview" / "index.html"

# プレビューで使うキーだけを渡す
KEYS = ["id", "label", "type", "required", "help", "options", "other", "unknown_option", "option_images",
        "skip_to_on", "show_if", "unit", "placeholder", "default", "hint", "body", "validation",
        "columns", "cells", "examples", "units"]


def _image_uri(path: str) -> str | None:
    """見本画像をページに埋め込む(無ければ None。ページ側で「準備中」を出す)。"""
    f = ROOT / path
    if not f.exists():
        return None
    mime = mimetypes.guess_type(f.name)[0] or "image/png"
    return f"data:{mime};base64," + base64.b64encode(f.read_bytes()).decode()


def form_spec(spec: dict, embed: bool = True) -> dict:
    """embed=False のときは、見本画像をファイルへのリンクのままにする(公開用ページ)。"""
    img = _image_uri if embed else (lambda path: "images/" + Path(path).name)
    sections = []
    for sec in spec["sections"]:
        items = [
            {k: ([img(x) for x in it[k]] if k == "option_images" else it[k]) for k in KEYS if k in it}
            for it in spec["items"]
            if it["route"] == "form" and it["section"] == sec["id"]
        ]
        sections.append({"id": sec["id"], "title": sec["title"], "desc": sec["desc"], "items": items})
    return {"form": spec["form"], "sections": sections}


def build(spec: dict, embed: bool = True) -> str:
    data = json.dumps(form_spec(spec, embed), ensure_ascii=False).replace("</", "<\\/")
    return TEMPLATE.read_text(encoding="utf-8").replace("/*__SPEC_JSON__*/null", data)


def build_site(spec: dict, out: Path) -> None:
    """1枚で開ける完全な HTML と、見本画像のファイルを書き出す。"""
    body = build(spec, embed=False)
    title = re.search(r"<title>.*?</title>", body).group(0)
    body = body.replace(title, "", 1)
    html = ('<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<meta name="format-detection" content="telephone=no">\n'
            '<meta name="apple-mobile-web-app-title" content="導入アンケート">\n'
            '<meta name="theme-color" content="#1f3a6b">\n'
            '<meta name="robots" content="noindex">\n'
            f"{title}\n</head>\n<body>\n{body}\n</body>\n</html>\n")
    (out / "images").mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(html, encoding="utf-8")
    for it in spec["items"]:
        for path in it.get("option_images", []):
            if (ROOT / path).exists():
                shutil.copy(ROOT / path, out / "images" / Path(path).name)


def main() -> None:
    if len(sys.argv) == 3 and sys.argv[1] == "--site":
        out = Path(sys.argv[2])
        build_site(load_spec(), out)
        print(f"wrote site to {out}")
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(build(load_spec()), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
