"""③ 対面レクチャー資料を spec/items.yaml と templates/slides/lecture.yaml から生成する。

使い方: python scripts/build_slides.py [--exclude 9 ...] [--deck-dir DIR]
  → slides/lecture.md(Marp。PDF・PPTXは Marp CLI で出力)
  → slides/checklist.md(当日チェックリスト・A4 1枚)
  → --deck-dir を付けると、Web で見るスライド(DIR/project/…)も書き出す
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from html import escape
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_items import load_spec  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LECTURE = ROOT / "templates" / "slides" / "lecture.yaml"
OUT_MD = ROOT / "slides" / "lecture.md"
OUT_CHECK = ROOT / "slides" / "checklist.md"

DECK_TITLE = "ポッキリ.Night 導入レクチャー"
FINAL_CHECKS = ["テスト会計の金額が正しい", "プリンターで領収書が出た", "全キャストが登録済み"]


def load_chapters(spec: dict, exclude: set[int] = frozenset()) -> list[dict]:
    """items.yaml の章情報と lecture.yaml の中身を合わせ、除外した章を抜いて返す。"""
    content = yaml.safe_load(LECTURE.read_text(encoding="utf-8"))["chapters"]
    chapters = []
    for ch in spec["chapters"]:
        if ch["id"] in exclude:
            continue
        chapters.append({**ch, **content[ch["id"]]})
    return chapters


def total_minutes(chapters: list[dict]) -> int:
    return sum(ch["minutes"] for ch in chapters)


# ── Marp(リポジトリ用) ───────────────────────────────


def marp(chapters: list[dict]) -> str:
    out = [
        "---", "marp: true", "size: 16:9", "paginate: true",
        "style: |",
        "  section { font-family: 'Noto Sans JP', sans-serif; background: #f7f3fc; color: #2b1f3d; }",
        "  h1, h2 { color: #673ab7; }",
        "  .time { position: absolute; top: 40px; right: 60px; font-size: 22px; color: #6b5d80; }",
        "---", "",
        f"# {DECK_TITLE}", "", "[店舗名] 様 / [訪問日]", "",
        f"所要時間 約{total_minutes(chapters)}分",
    ]
    for ch in chapters:
        out += ["", "---", "", f"<div class=\"time\">{ch['id']}章 〔目安 {ch['minutes']}分〕</div>", "",
                f"# {ch['id']}. {ch['title']}", "", f"同席してほしい人:{ch['attendees']}"]
        for sl in ch["slides"]:
            kind = sl.get("kind", "op")
            if kind == "agenda":
                out += ["", "---", "", f"## {sl['title']}", "", sl["lead"], "",
                        "| 章 | 内容 | 同席してほしい人 | 目安 |", "|---|---|---|---|"]
                out += [f"| {c['id']} | {c['title']} | {c['attendees']} | {c['minutes']}分 |" for c in chapters]
                continue
            out += ["", "---", "", f"<div class=\"time\">{ch['id']}章 〔目安 {ch['minutes']}分〕</div>", "",
                    f"## {sl['title']}", ""]
            if kind == "table":
                if sl.get("lead"):
                    out += [sl["lead"], ""]
                out += ["| " + " | ".join(sl["columns"]) + " |", "|" + "---|" * len(sl["columns"])]
                out += ["| " + " | ".join(r) + " |" for r in sl["rows"]]
            elif kind == "faq":
                out += [*[f"- {c}" for c in sl["contact"]], ""]
                out += [f"**{q}** … {a}  " for q, a in sl["faq"]]
            else:
                out += [f"{i}. {s}" for i, s in enumerate(sl["steps"], 1)]
                out += ["", f"![画面](images/{sl['screen']})", "", f"**やってみよう:** {sl['try']}"]
        if ch["checks"]:
            out += ["", "**できたらチェック**", *[f"- [ ] {c}" for c in ch["checks"]]]
    return "\n".join(out) + "\n"


def checklist(chapters: list[dict]) -> str:
    out = [f"# {DECK_TITLE} 当日チェックリスト", "",
           "店舗名:＿＿＿＿＿＿＿＿　訪問日:＿＿＿＿＿＿　導入担当:＿＿＿＿＿＿", "",
           "| 章 | できたこと | できた | 担当者サイン |", "|---|---|:---:|---|"]
    for ch in chapters:
        for c in ch["checks"]:
            out.append(f"| {ch['id']} {ch['title']} | {c} | □ | |")
    out += ["", "## 最後に、この3つを確認します", ""]
    out += [f"## □ {c}" for c in FINAL_CHECKS]
    return "\n".join(out) + "\n"


# ── Web のスライド(Slides アーティファクト用) ─────────────────

INK, LIGHT, SOFT, ACCENT, DARK, MUTED, LINE = "#2b1f3d", "#f7f3fc", "#ede4f8", "#673ab7", "#241a33", "#6b5d80", "#d9cfe6"
FONT = "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif"
BASE = f"background:{LIGHT}; color:{INK}; font-family:{FONT}; padding:128px 128px 160px; display:flex; flex-direction:column; gap:40px"


def _time(ch: dict) -> str:
    return (f'<p style="position:absolute; right:128px; top:60px; width:640px; text-align:right; font-size:24px; color:{MUTED}">'
            f'{ch["id"]}章 {escape(ch["title"])} 〔目安 {ch["minutes"]}分〕</p>')


def _footer() -> str:
    return (f'<p style="position:absolute; left:128px; bottom:64px; width:1200px; font-size:24px; color:{MUTED}">'
            f'{escape(DECK_TITLE)}</p>')


def _checks(items: list[str]) -> str:
    boxes = "".join(
        f'<div style="display:flex; flex-direction:row; align-items:center; gap:14px">'
        f'<div style="width:30px; height:30px; border:3px solid {ACCENT}; border-radius:6px"></div>'
        f'<p style="font-size:30px">{escape(c)}</p></div>'
        for c in items)
    return (f'<div style="display:flex; flex-direction:row; align-items:center; gap:40px; flex-wrap:wrap; border-top:2px solid {LINE}; padding:24px 0 0 0">'
            f'<p style="font-size:28px; font-weight:700; color:{ACCENT}">できたらチェック</p>{boxes}</div>')


def slide_cover(chapters: list[dict]) -> str:
    return (f'<section id="cover" style="background:{DARK}; color:{LIGHT}; font-family:{FONT}; padding:128px; display:flex; '
            f'flex-direction:column; justify-content:flex-end; gap:32px">'
            f'<div style="width:120px; height:12px; background:{ACCENT}; border-radius:6px"></div>'
            f'<h1 style="font-size:104px; font-weight:700; line-height:1.15">ポッキリ.Night<br>導入レクチャー</h1>'
            f'<p style="font-size:40px; color:#cbbde0">[店舗名] 様 ・ [訪問日]</p>'
            f'<p style="font-size:32px; color:#cbbde0">所要時間 約{total_minutes(chapters)}分 ・ 全{len(chapters) - 1}章</p>'
            f'<aside>最初に、今日の流れと所要時間を説明します。</aside></section>')


def slide_agenda(sl: dict, chapters: list[dict]) -> str:
    rows = [c for c in chapters if c["id"] != 0]
    half = (len(rows) + 1) // 2

    def table(part):
        widths = ["10%", "38%", "36%", "16%"]
        head = "".join(f'<th style="width:{w}; text-align:left; padding:10px 16px; color:{MUTED}">{h}</th>'
                       for w, h in zip(widths, ["章", "内容", "同席してほしい人", "目安"]))
        body = "".join(
            f'<tr><td style="padding:10px 16px; color:{ACCENT}"><b>{c["id"]}</b></td>'
            f'<td style="padding:10px 16px">{escape(c["title"])}</td>'
            f'<td style="padding:10px 16px; color:{MUTED}">{escape(c["attendees"])}</td>'
            f'<td style="padding:10px 16px">{c["minutes"]}分</td></tr>' for c in part)
        return (f'<div style="flex:1; display:flex; flex-direction:column">'
                f'<table style="font-size:26px; background:#ffffff"><tr>{head}</tr>{body}</table></div>')

    return (f'<section id="agenda" style="{BASE}">'
            f'<h2 style="font-size:64px; font-weight:700; line-height:1.1">{escape(sl["title"])}</h2>'
            f'<p style="font-size:32px; color:{MUTED}">{escape(sl["lead"])}</p>'
            f'<div style="display:flex; flex-direction:row; gap:48px; align-items:flex-start">{table(rows[:half])}{table(rows[half:])}</div>'
            f'{_footer()}</section>')


def slide_divider(ch: dict) -> str:
    items = "".join(f'<li>{escape(c)}</li>' for c in ch["checks"])
    goal = (f'<div style="display:flex; flex-direction:column; gap:16px"><p style="font-size:28px; color:#cbbde0">この章でできるようになること</p>'
            f'<ul style="font-size:36px; line-height:1.5; color:{LIGHT}">{items}</ul></div>') if items else ""
    return (f'<section id="ch{ch["id"]:02d}" data-transition="fade" style="background:{ACCENT}; color:{LIGHT}; font-family:{FONT}; '
            f'padding:128px; display:flex; flex-direction:column; justify-content:center; gap:48px">'
            f'<p style="font-size:40px; color:#e3d6f5">{ch["id"]}章 ・ 目安 {ch["minutes"]}分</p>'
            f'<h2 style="font-size:96px; font-weight:700; line-height:1.1">{escape(ch["title"])}</h2>'
            f'<p style="font-size:36px">同席してほしい人:{escape(ch["attendees"])}</p>{goal}'
            f'<aside>{escape(ch["attendees"])}に集まってもらってから始めます。</aside></section>')


def slide_op(sid: str, ch: dict, sl: dict, last: bool) -> str:
    steps = "".join(f'<li>{escape(s)}</li>' for s in sl["steps"])
    note = f'<p style="font-size:28px; color:{MUTED}">{escape(sl["note"])}</p>' if sl.get("note") else ""
    frame = (f'<div style="width:720px; height:{360 if last else 420}px; border:3px dashed {LINE}; border-radius:16px; background:#ffffff; '
             f'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px">'
             f'<p style="font-size:28px; color:{MUTED}">画面のスクリーンショット</p>'
             f'<p style="font-size:24px; color:{MUTED}">images/{escape(sl["screen"])}</p></div>')
    tryband = (f'<div style="display:flex; flex-direction:row; align-items:center; gap:28px; background:{SOFT}; padding:24px 40px; border-radius:16px">'
               f'<p style="font-size:30px; font-weight:700; color:{ACCENT}">やってみよう</p>'
               f'<p style="font-size:36px; font-weight:500">{escape(sl["try"])}</p></div>')
    return (f'<section id="{sid}" style="{BASE}">{_time(ch)}'
            f'<h2 style="font-size:64px; font-weight:700; line-height:1.1">{escape(sl["title"])}</h2>'
            f'<div style="display:flex; flex-direction:row; gap:64px; align-items:flex-start">'
            f'<div style="flex:1; display:flex; flex-direction:column; gap:24px">'
            f'<ol style="font-size:40px; line-height:1.6">{steps}</ol>{note}</div>{frame}</div>'
            f'{tryband}{_checks(ch["checks"]) if last and ch["checks"] else ""}{_footer()}</section>')


def slide_table(sid: str, ch: dict, sl: dict, last: bool) -> str:
    size = 28 if len(sl["rows"]) > 6 else 36
    pad = "8px 20px" if len(sl["rows"]) > 6 else "16px 24px"
    widths = ["34%", "66%"] if len(sl["columns"]) == 2 else [""] * len(sl["columns"])
    head = "".join(f'<th style="{"width:" + w + "; " if w else ""}text-align:left; padding:{pad}; color:{MUTED}">{escape(h)}</th>'
                   for w, h in zip(widths, sl["columns"]))
    body = "".join(
        "<tr>" + "".join(
            f'<td style="padding:{pad}">{"<b>" + escape(v) + "</b>" if i == 0 else escape(v)}</td>'
            for i, v in enumerate(r)) + "</tr>" for r in sl["rows"])
    lead = f'<p style="font-size:32px; color:{MUTED}">{escape(sl["lead"])}</p>' if sl.get("lead") else ""
    return (f'<section id="{sid}" style="{BASE.replace("gap:40px", "gap:28px")}">{_time(ch)}'
            f'<h2 style="font-size:64px; font-weight:700; line-height:1.1">{escape(sl["title"])}</h2>{lead}'
            f'<table style="font-size:{size}px; background:#ffffff"><tr>{head}</tr>{body}</table>'
            f'{_checks(ch["checks"]) if last and ch["checks"] else ""}{_footer()}</section>')


def slide_faq(sid: str, ch: dict, sl: dict) -> str:
    contact = "".join(f'<p style="font-size:36px">{escape(c)}</p>' for c in sl["contact"])
    faq = "".join(
        f'<div style="display:flex; flex-direction:column; gap:6px; padding:20px 0 20px 0; border-bottom:1px solid {LINE}">'
        f'<h3 style="font-size:36px; font-weight:700">{escape(q)}</h3><p style="font-size:30px; color:{MUTED}">{escape(a)}</p></div>'
        for q, a in sl["faq"])
    return (f'<section id="{sid}" style="{BASE}">{_time(ch)}'
            f'<h2 style="font-size:64px; font-weight:700; line-height:1.1">{escape(sl["title"])}</h2>'
            f'<div style="display:flex; flex-direction:row; gap:64px; align-items:flex-start">'
            f'<div style="width:620px; display:flex; flex-direction:column; gap:16px; background:#ffffff; padding:40px; border:1px solid {LINE}; border-radius:16px">'
            f'<h3 style="font-size:32px; font-weight:700; color:{ACCENT}">問い合わせ先</h3>{contact}</div>'
            f'<div style="flex:1; display:flex; flex-direction:column">{faq}</div></div>{_footer()}'
            f'<aside>[ ] の所は、訪問前に書き換えておきます。</aside></section>')


def slide_final(chapters: list[dict]) -> str:
    big = "".join(
        f'<div style="display:flex; flex-direction:row; align-items:center; gap:28px; background:#ffffff; padding:28px 40px; border:1px solid {LINE}; border-radius:16px">'
        f'<div style="width:56px; height:56px; border:5px solid {ACCENT}; border-radius:10px"></div>'
        f'<p style="font-size:48px; font-weight:700">{escape(c)}</p></div>' for c in FINAL_CHECKS)
    return (f'<section id="final" style="{BASE.replace("gap:40px", "gap:32px")}">'
            f'<h2 style="font-size:64px; font-weight:700; line-height:1.1">最後に、この3つを確認します</h2>'
            f'<div style="display:flex; flex-direction:column; gap:24px">{big}</div>'
            f'<p style="font-size:30px; color:{MUTED}">章ごとのチェックは、当日チェックリスト(A4)に記入します。</p>'
            f'{_footer()}<aside>3つとも済んだら、本日のレクチャーは終わりです。</aside></section>')


def deck(chapters: list[dict]) -> tuple[dict, dict[str, str]]:
    """(deck.json, {slide id: html}) を返す。"""
    files: dict[str, str] = {"cover": slide_cover(chapters)}
    sections = {"s0": {"description": "表紙と本日の流れ", "start": "cover"}}
    for ch in chapters:
        if ch["id"] != 0:
            sid = f"ch{ch['id']:02d}"
            files[sid] = slide_divider(ch)
            sections[f"s{ch['id']}"] = {"description": f"{ch['id']}章 {ch['title']}", "start": sid}
        for n, sl in enumerate(ch["slides"], 1):
            kind = sl.get("kind", "op")
            last = n == len(ch["slides"])
            sid = f"c{ch['id']:02d}-{n}"
            if kind == "agenda":
                files["agenda"] = slide_agenda(sl, chapters)
            elif kind == "table":
                files[sid] = slide_table(sid, ch, sl, last)
            elif kind == "faq":
                files[sid] = slide_faq(sid, ch, sl)
            else:
                files[sid] = slide_op(sid, ch, sl, last)
    files["final"] = slide_final(chapters)
    index = {
        "v": 4,
        "createdOnFiles": {"v": 1, "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
        "title": DECK_TITLE,
        "order": list(files),
        "sections": sections,
        "cover": "cover",
        "faces": {"noto-sans-jp": {"family": "Noto Sans JP",
                                   "href": "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"}},
        "designSystems": [],
    }
    return index, files


def write_deck(chapters: list[dict], out: Path) -> None:
    index, files = deck(chapters)
    (out / "project" / "slides").mkdir(parents=True, exist_ok=True)
    for old in (out / "project" / "slides").glob("*.html"):
        old.unlink()
    for sid, html in files.items():
        (out / "project" / "slides" / f"{sid}.html").write_text(html + "\n", encoding="utf-8")
    (out / "project" / "deck.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exclude", type=int, nargs="*", default=[], help="除外する章(①で「使わない」とされた機能)")
    ap.add_argument("--deck-dir", type=Path, help="Web 用スライドの書き出し先")
    args = ap.parse_args()
    chapters = load_chapters(load_spec(), set(args.exclude))
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    (OUT_MD.parent / "images").mkdir(exist_ok=True)
    (OUT_MD.parent / "images" / ".gitkeep").touch()
    OUT_MD.write_text(marp(chapters), encoding="utf-8")
    OUT_CHECK.write_text(checklist(chapters), encoding="utf-8")
    print(f"wrote {OUT_MD.relative_to(ROOT)} and {OUT_CHECK.relative_to(ROOT)}")
    if args.deck_dir:
        write_deck(chapters, args.deck_dir)
        print(f"wrote deck to {args.deck_dir}")


if __name__ == "__main__":
    main()
