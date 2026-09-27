"""③ 対面レクチャー資料を spec/items.yaml と templates/slides/lecture.yaml から生成する。

13章を6つのまとまりに分け、1まとまり2〜3枚(全体で15〜20枚)にまとめる。

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


def load_lecture(spec: dict, exclude: set[int] = frozenset()) -> dict:
    """章(items.yaml)とまとまり(lecture.yaml)を合わせ、除外した章の操作・スライドを抜いて返す。

    返り値: {"chapters": [章…], "parts": [まとまり…], "checks": {章id: [文言…]}}
    """
    lec = yaml.safe_load(LECTURE.read_text(encoding="utf-8"))
    chapters = [ch for ch in spec["chapters"] if ch["id"] not in exclude]
    keep = {ch["id"] for ch in chapters}
    parts = []
    for part in lec["parts"]:
        slides = []
        for sl in part["slides"]:
            if sl["kind"] == "ops":
                ops = [op for op in sl["ops"] if op["chapter"] in keep]
                if ops:
                    slides.append({**sl, "ops": ops})
            elif sl["chapter"] in keep:
                slides.append(sl)
        if slides:
            parts.append({**part, "chapters": [c for c in part["chapters"] if c in keep], "slides": slides})
    checks = {c: v for c, v in lec["checks"].items() if c in keep}
    return {"chapters": chapters, "parts": parts, "checks": checks}


def total_minutes(chapters: list[dict]) -> int:
    return sum(ch["minutes"] for ch in chapters)


def slide_chapters(sl: dict) -> list[int]:
    return sorted({op["chapter"] for op in sl["ops"]}) if sl["kind"] == "ops" else [sl["chapter"]]


def closing_chapters(part: dict) -> dict[int, list[int]]:
    """スライドの番号 → そのスライドで終わる章(できたらチェックを出す章)。"""
    last: dict[int, int] = {}
    for n, sl in enumerate(part["slides"]):
        for c in slide_chapters(sl):
            last[c] = n
    out: dict[int, list[int]] = {}
    for c, n in last.items():
        out.setdefault(n, []).append(c)
    return out


def part_meta(part: dict, chapters: list[dict]) -> str:
    by_id = {c["id"]: c for c in chapters}
    chs = [by_id[c] for c in part["chapters"]]
    people: list[str] = []
    for c in chs:
        for p in c["attendees"].split("・"):
            if p not in people:
                people.append(p)
    nums = "・".join(str(c["id"]) for c in chs)
    return f"{nums}章 〔目安 {total_minutes(chs)}分〕 同席:{'・'.join(people)}"


# ── Marp(リポジトリ用) ───────────────────────────────


def marp(lec: dict) -> str:
    chapters, parts, checks = lec["chapters"], lec["parts"], lec["checks"]
    out = [
        "---", "marp: true", "size: 16:9", "paginate: true",
        "style: |",
        "  section { font-family: 'Noto Sans JP', sans-serif; background: #f3f6fb; color: #1c2433; }",
        "  h1, h2 { color: #1f3a6b; }",
        "  .time { position: absolute; top: 40px; right: 60px; font-size: 22px; color: #5b6678; }",
        "  .cols { display: flex; gap: 40px; }",
        "---", "",
        f"# {DECK_TITLE}", "", "[店舗名] 様 / [訪問日]", "",
        f"所要時間 約{total_minutes(chapters)}分",
        "", "---", "", "## 本日の流れ", "",
        "| 章 | 内容 | 同席してほしい人 | 目安 |", "|---|---|---|---|",
    ]
    out += [f"| {c['id']} | {c['title']} | {c['attendees']} | {c['minutes']}分 |" for c in chapters if c["id"]]
    for part in parts:
        closing = closing_chapters(part)
        for n, sl in enumerate(part["slides"]):
            out += ["", "---", "", f"<div class=\"time\">{part_meta(part, chapters)}</div>", "",
                    f"## {sl['title']}", ""]
            if sl["kind"] == "table":
                out += ["| " + " | ".join(sl["columns"]) + " |", "|" + "---|" * len(sl["columns"])]
                out += ["| " + " | ".join(r) + " |" for r in sl["rows"]]
            elif sl["kind"] == "faq":
                out += [*[f"- {c}" for c in sl["contact"]], ""]
                out += [f"**{q}** … {a}  " for q, a in sl["faq"]]
            else:
                out.append('<div class="cols">')
                for op in sl["ops"]:
                    out += ["", "<div>", "", f"### {op['title']}", ""]
                    out += [f"{i}. {s}" for i, s in enumerate(op["steps"], 1)]
                    out += ["", f"![画面](images/{op['screen']})", "", f"**やってみよう:** {op['try']}", "", "</div>"]
                out.append("</div>")
            done = [c for ch in closing.get(n, []) for c in checks.get(ch, [])]
            if done:
                out += ["", "**できたらチェック** " + " ".join(f"□ {c}" for c in done)]
    out += ["", "---", "", "## 最後に、この3つを確認します", "", *[f"### □ {c}" for c in FINAL_CHECKS]]
    return "\n".join(out) + "\n"


def checklist(lec: dict) -> str:
    by_id = {c["id"]: c for c in lec["chapters"]}
    out = [f"# {DECK_TITLE} 当日チェックリスト", "",
           "店舗名:＿＿＿＿＿＿＿＿　訪問日:＿＿＿＿＿＿　導入担当:＿＿＿＿＿＿", "",
           "| 章 | できたこと | できた | 担当者サイン |", "|---|---|:---:|---|"]
    for cid, items in lec["checks"].items():
        for c in items:
            out.append(f"| {cid} {by_id[cid]['title']} | {c} | □ | |")
    out += ["", "## 最後に、この3つを確認します", ""]
    out += [f"## □ {c}" for c in FINAL_CHECKS]
    return "\n".join(out) + "\n"


# ── Web のスライド(Slides アーティファクト用) ─────────────────

INK, LIGHT, SOFT, ACCENT, DARK, MUTED, LINE = "#1c2433", "#f3f6fb", "#e3eaf5", "#1f3a6b", "#14213b", "#5b6678", "#cfd8e6"
CARD = "#fcfdff"
FONT = "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif"
BASE = (f"background:{LIGHT}; color:{INK}; font-family:{FONT}; padding:128px 128px 160px; "
        f"display:flex; flex-direction:column; gap:32px")


def _meta(text: str) -> str:
    return (f'<p style="position:absolute; right:128px; top:60px; width:1100px; text-align:right; font-size:24px; color:{MUTED}">'
            f'{escape(text)}</p>')


def _eyebrow(text: str) -> str:
    return (f'<p style="position:absolute; left:128px; top:60px; width:560px; font-size:24px; font-weight:700; color:{ACCENT}">'
            f'{escape(text)}</p>')


def _footer() -> str:
    return (f'<p style="position:absolute; left:128px; bottom:64px; width:1200px; font-size:24px; color:{MUTED}">'
            f'{escape(DECK_TITLE)}</p>')


def _checks(items: list[str]) -> str:
    boxes = "".join(
        f'<div style="display:flex; flex-direction:row; align-items:center; gap:12px">'
        f'<div style="width:28px; height:28px; border:3px solid {ACCENT}; border-radius:6px"></div>'
        f'<p style="font-size:28px">{escape(c)}</p></div>'
        for c in items)
    return (f'<div style="display:flex; flex-direction:row; align-items:center; gap:36px; flex-wrap:wrap; '
            f'border-top:2px solid {LINE}; padding:20px 0 0 0">'
            f'<p style="font-size:26px; font-weight:700; color:{ACCENT}">できたらチェック</p>{boxes}</div>')


def _frame(height: int, screen: str, width: str = "") -> str:
    w = f"width:{width}; " if width else ""
    return (f'<div style="{w}height:{height}px; border:3px dashed {LINE}; border-radius:12px; background:#ffffff; '
            f'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px">'
            f'<p style="font-size:26px; color:{MUTED}">画面のスクリーンショット</p>'
            f'<p style="font-size:24px; color:{MUTED}">images/{escape(screen)}</p></div>')


def _try(text: str, big: bool) -> str:
    size = 36 if big else 30
    return (f'<div style="display:flex; flex-direction:row; align-items:center; gap:24px; background:{SOFT}; '
            f'padding:{"24px 40px" if big else "18px 28px"}; border-radius:14px">'
            f'<p style="font-size:26px; font-weight:700; color:{ACCENT}; white-space:nowrap">やってみよう</p>'
            f'<p style="font-size:{size}px; font-weight:500">{escape(text)}</p></div>')


def slide_cover(chapters: list[dict]) -> str:
    return (f'<section id="cover" style="background:{DARK}; color:{LIGHT}; font-family:{FONT}; padding:128px; display:flex; '
            f'flex-direction:column; justify-content:flex-end; gap:32px">'
            f'<div style="width:120px; height:12px; background:{ACCENT}; border-radius:6px"></div>'
            f'<h1 style="font-size:104px; font-weight:700; line-height:1.15">ポッキリ.Night<br>導入レクチャー</h1>'
            f'<p style="font-size:40px; color:#c3cfe3">[店舗名] 様 ・ [訪問日]</p>'
            f'<p style="font-size:32px; color:#c3cfe3">所要時間 約{total_minutes(chapters)}分 ・ 全{len(chapters) - 1}章</p>'
            f'<aside>最初に、今日の流れと所要時間を説明します。</aside></section>')


def slide_agenda(lec: dict) -> str:
    rows = [c for c in lec["chapters"] if c["id"] != 0]
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
            f'<h2 style="font-size:64px; font-weight:700; line-height:1.1">本日の流れ</h2>'
            f'<p style="font-size:32px; color:{MUTED}">実際にPOSを触りながら、ひとつずつ覚えていきます。</p>'
            f'<div style="display:flex; flex-direction:row; gap:48px; align-items:flex-start">{table(rows[:half])}{table(rows[half:])}</div>'
            f'{_footer()}</section>')


def _op_card(op: dict, chapter_title: str) -> str:
    steps = "".join(f"<li>{escape(s)}</li>" for s in op["steps"])
    return (f'<div style="flex:1; display:flex; flex-direction:column; gap:20px; background:{CARD}; padding:32px; '
            f'border:1px solid {LINE}; border-radius:16px">'
            f'<p style="font-size:24px; color:{MUTED}">{op["chapter"]}章 {escape(chapter_title)}</p>'
            f'<h3 style="font-size:40px; font-weight:700; line-height:1.2">{escape(op["title"])}</h3>'
            f'<ol style="font-size:32px; line-height:1.5">{steps}</ol>'
            f'{_frame(150, op["screen"])}{_try(op["try"], big=False)}</div>')


def slide_ops(sid: str, part: dict, sl: dict, meta: str, done: list[str], titles: dict[int, str]) -> str:
    ops = sl["ops"]
    if len(ops) == 1:
        op = ops[0]
        steps = "".join(f"<li>{escape(s)}</li>" for s in op["steps"])
        body = (f'<div style="display:flex; flex-direction:row; gap:64px; align-items:flex-start">'
                f'<div style="flex:1; display:flex; flex-direction:column; gap:16px">'
                f'<p style="font-size:26px; color:{MUTED}">{op["chapter"]}章 {escape(titles[op["chapter"]])}</p>'
                f'<ol style="font-size:40px; line-height:1.6">{steps}</ol></div>'
                f'{_frame(380, op["screen"], "720px")}</div>{_try(op["try"], big=True)}')
    else:
        body = (f'<div style="display:flex; flex-direction:row; gap:48px; align-items:stretch">'
                + "".join(_op_card(op, titles[op["chapter"]]) for op in ops) + "</div>")
    return (f'<section id="{sid}" style="{BASE}">{_eyebrow(part["title"])}{_meta(meta)}'
            f'<h2 style="font-size:60px; font-weight:700; line-height:1.1">{escape(sl["title"])}</h2>'
            f'{body}{_checks(done) if done else ""}{_footer()}</section>')


def slide_table(sid: str, part: dict, sl: dict, meta: str, done: list[str]) -> str:
    size = 28 if len(sl["rows"]) > 6 else 36
    pad = "8px 20px" if len(sl["rows"]) > 6 else "16px 24px"
    widths = ["34%", "66%"] if len(sl["columns"]) == 2 else [""] * len(sl["columns"])
    head = "".join(f'<th style="{"width:" + w + "; " if w else ""}text-align:left; padding:{pad}; color:{MUTED}">{escape(h)}</th>'
                   for w, h in zip(widths, sl["columns"]))
    body = "".join(
        "<tr>" + "".join(
            f'<td style="padding:{pad}">{"<b>" + escape(v) + "</b>" if i == 0 else escape(v)}</td>'
            for i, v in enumerate(r)) + "</tr>" for r in sl["rows"])
    return (f'<section id="{sid}" style="{BASE.replace("gap:32px", "gap:28px")}">{_eyebrow(part["title"])}{_meta(meta)}'
            f'<h2 style="font-size:60px; font-weight:700; line-height:1.1">{escape(sl["title"])}</h2>'
            f'<table style="font-size:{size}px; background:#ffffff"><tr>{head}</tr>{body}</table>'
            f'{_checks(done) if done else ""}{_footer()}</section>')


def slide_faq(sid: str, part: dict, sl: dict, meta: str) -> str:
    contact = "".join(f'<p style="font-size:36px">{escape(c)}</p>' for c in sl["contact"])
    faq = "".join(
        f'<div style="display:flex; flex-direction:column; gap:6px; padding:20px 0 20px 0; border-bottom:1px solid {LINE}">'
        f'<h3 style="font-size:36px; font-weight:700">{escape(q)}</h3><p style="font-size:30px; color:{MUTED}">{escape(a)}</p></div>'
        for q, a in sl["faq"])
    return (f'<section id="{sid}" style="{BASE}">{_eyebrow(part["title"])}{_meta(meta)}'
            f'<h2 style="font-size:60px; font-weight:700; line-height:1.1">{escape(sl["title"])}</h2>'
            f'<div style="display:flex; flex-direction:row; gap:64px; align-items:flex-start">'
            f'<div style="width:620px; display:flex; flex-direction:column; gap:16px; background:#ffffff; padding:40px; '
            f'border:1px solid {LINE}; border-radius:16px">'
            f'<h3 style="font-size:32px; font-weight:700; color:{ACCENT}">問い合わせ先</h3>{contact}</div>'
            f'<div style="flex:1; display:flex; flex-direction:column">{faq}</div></div>{_footer()}'
            f'<aside>[ ] の所は、訪問前に書き換えておきます。</aside></section>')


def slide_final() -> str:
    big = "".join(
        f'<div style="display:flex; flex-direction:row; align-items:center; gap:28px; background:#ffffff; padding:28px 40px; '
        f'border:1px solid {LINE}; border-radius:16px">'
        f'<div style="width:56px; height:56px; border:5px solid {ACCENT}; border-radius:10px"></div>'
        f'<p style="font-size:48px; font-weight:700">{escape(c)}</p></div>' for c in FINAL_CHECKS)
    return (f'<section id="final" style="{BASE}">'
            f'<h2 style="font-size:64px; font-weight:700; line-height:1.1">最後に、この3つを確認します</h2>'
            f'<div style="display:flex; flex-direction:column; gap:24px">{big}</div>'
            f'<p style="font-size:30px; color:{MUTED}">章ごとのチェックは、当日チェックリスト(A4)に記入します。</p>'
            f'{_footer()}<aside>3つとも済んだら、本日のレクチャーは終わりです。</aside></section>')


def deck(lec: dict) -> tuple[dict, dict[str, str]]:
    """(deck.json, {slide id: html}) を返す。"""
    chapters, checks = lec["chapters"], lec["checks"]
    titles = {c["id"]: c["title"] for c in chapters}
    files: dict[str, str] = {"cover": slide_cover(chapters), "agenda": slide_agenda(lec)}
    sections = {"s0": {"description": "表紙と本日の流れ", "start": "cover"}}
    for p, part in enumerate(lec["parts"], 1):
        meta = part_meta(part, chapters)
        closing = closing_chapters(part)
        for n, sl in enumerate(part["slides"]):
            sid = f"p{p}-{n + 1}"
            if n == 0:
                sections[f"s{p}"] = {"description": part["title"], "start": sid}
            done = [c for ch in closing.get(n, []) for c in checks.get(ch, [])]
            if sl["kind"] == "ops":
                files[sid] = slide_ops(sid, part, sl, meta, done, titles)
            elif sl["kind"] == "table":
                files[sid] = slide_table(sid, part, sl, meta, done)
            else:
                files[sid] = slide_faq(sid, part, sl, meta)
    files["final"] = slide_final()
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


def write_deck(lec: dict, out: Path) -> None:
    index, files = deck(lec)
    slides_dir = out / "project" / "slides"
    slides_dir.mkdir(parents=True, exist_ok=True)
    for old in slides_dir.glob("*.html"):
        old.unlink()
    for sid, html in files.items():
        (slides_dir / f"{sid}.html").write_text(html + "\n", encoding="utf-8")
    (out / "project" / "deck.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exclude", type=int, nargs="*", default=[], help="除外する章(①で「使わない」とされた機能)")
    ap.add_argument("--deck-dir", type=Path, help="Web 用スライドの書き出し先")
    args = ap.parse_args()
    lec = load_lecture(load_spec(), set(args.exclude))
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    (OUT_MD.parent / "images").mkdir(exist_ok=True)
    (OUT_MD.parent / "images" / ".gitkeep").touch()
    OUT_MD.write_text(marp(lec), encoding="utf-8")
    OUT_CHECK.write_text(checklist(lec), encoding="utf-8")
    print(f"wrote {OUT_MD.relative_to(ROOT)} and {OUT_CHECK.relative_to(ROOT)}")
    if args.deck_dir:
        write_deck(lec, args.deck_dir)
        print(f"wrote deck to {args.deck_dir} ({len(deck(lec)[1])} slides)")


if __name__ == "__main__":
    main()
